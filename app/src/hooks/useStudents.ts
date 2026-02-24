import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { db } from '../lib/db'
import { useAppStore } from '../stores/useAppStore'
import type { Student } from '../types'

export const useStudents = () => {
  const queryClient = useQueryClient()
  const activeProjectId = useAppStore((state) => state.activeProjectId)

  const QUERY_KEY = ['students', activeProjectId]

  const studentsQuery = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => db.students.orderBy('lastname').toArray(),
    enabled: !!activeProjectId,
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
