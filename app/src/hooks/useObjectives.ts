import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { db } from '../lib/db'
import { useAppStore } from '../stores/useAppStore'
import type { Objective } from '../types'

export const useObjectives = () => {
  const queryClient = useQueryClient()
  const activeProjectId = useAppStore((state) => state.activeProjectId)

  const QUERY_KEY = ['objectives', activeProjectId]

  const normalizeObjective = (objective: Objective): Objective => ({
    ...objective,
    indicators: objective.indicators.map((indicator) => {
      const legacy = indicator as unknown as {
        expectedEvidence?: string
        taxonomy?: string
        conditions?: string
        expectedResults?: string
      }
      return {
        ...indicator,
        taxonomy: legacy.taxonomy ?? 'Connaître',
        conditions: legacy.conditions ?? '',
        expectedResults: legacy.expectedResults ?? legacy.expectedEvidence ?? '',
      }
    }),
  })

  const objectivesQuery = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const items = await db.objectives.orderBy('number').toArray()
      return items.map((item) => normalizeObjective(item))
    },
    enabled: !!activeProjectId,
  })

  const upsert = useMutation({
    mutationFn: (objective: Objective) => db.objectives.put(objective),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })

  const remove = useMutation({
    mutationFn: (id: string) => db.objectives.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })

  const reorder = useMutation({
    mutationFn: async (objectives: Objective[]) => {
      await db.objectives.bulkPut(
        objectives.map((objective, index) => ({
          ...objective,
          number: index + 1,
        })),
      )
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })

  const replaceAll = useMutation({
    mutationFn: async (objectives: Objective[]) => {
      await db.objectives.clear()
      await db.objectives.bulkAdd(objectives)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })

  return {
    objectives: objectivesQuery.data ?? [],
    isLoading: objectivesQuery.isLoading,
    upsert,
    remove,
    reorder,
    replaceAll,
  }
}
