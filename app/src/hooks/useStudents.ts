import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { db } from '../lib/db'
import type { Student } from '../types'

const QUERY_KEY = ['students']

export const useStudents = () => {
  const queryClient = useQueryClient()

  const studentsQuery = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => db.students.orderBy('lastname').toArray(),
  })

  const replaceAll = useMutation({
    mutationFn: async (students: Student[]) => {
      await db.transaction('rw', db.students, async () => {
        await db.students.clear()
        await db.students.bulkPut(students)
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })

  const saveStudent = useMutation({
    mutationFn: (student: Student) => db.students.put(student),
    onSuccess: async () => {
      // Invalider le cache ET attendre le refetch complet
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      // Force une refetch immédiate pour s'assurer que les données sont à jour
      await queryClient.refetchQueries({ queryKey: QUERY_KEY })
    },
  })

  return {
    students: studentsQuery.data ?? [],
    isLoading: studentsQuery.isLoading,
    replaceAll,
    saveStudent,
  }
}
