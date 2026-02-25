import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { db } from '../lib/db'
import { calculateFinalGrade, calculateGridTotals } from '../lib/calculations'
import { useAppStore } from '../stores/useAppStore'
import type { Evaluation, Objective, StudentGrid } from '../types'

export const useEvaluation = (studentId: string | null, objectives: Objective[], scoringMode: '0-3' | 'points' = '0-3') => {
  const queryClient = useQueryClient()
  const settings = useAppStore((state) => state.settings)
  const activeProjectId = useAppStore((state) => state.activeProjectId)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const gridQuery = useQuery({
    queryKey: ['grid', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      if (!studentId) return null
      return db.grids.get(studentId)
    },
  })

  const saveGrid = useMutation({
    mutationFn: async (evaluations: Evaluation[]) => {
      if (!studentId) return
      setSaveStatus('saving')
      const totals = calculateGridTotals(objectives, evaluations, scoringMode)
      const existingGrid = await db.grids.get(studentId)
      const grid: StudentGrid = {
        studentId,
        evaluations,
        totalPoints: totals.totalPoints,
        maxPoints: totals.maxPoints,
        finalGrade: calculateFinalGrade(
          totals.totalPoints,
          totals.maxPoints,
          settings.threshold,
          settings.correctionError,
        ),
        moduleName: settings.moduleName,
        moduleDescription: settings.moduleDescription,
        testDate: settings.testDate,
        testDateOverride: existingGrid?.testDateOverride, // Conserver la date alternative
        correctedBy: settings.correctedBy, // Ajouter le correcteur depuis les settings
        generatedAt: new Date(),
        completedAt: existingGrid?.completedAt ?? null,
      }
      // Passer activeProjectId pour que la grille soit persistée en DB
      // Note : on autorise maintenant la suppression complète des scores si l'utilisateur le souhaite
      await db.grids.put(grid, activeProjectId || undefined)
    },
    onSuccess: () => {
      setSaveStatus('saved')
      queryClient.invalidateQueries({ queryKey: ['grid', studentId] })
      queryClient.invalidateQueries({ queryKey: ['grids', activeProjectId] })
      // Réinitialiser le statut après 2 secondes
      setTimeout(() => setSaveStatus('idle'), 2000)
    },
    onError: () => {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    },
  })

  const markAsCompleted = useMutation({
    mutationFn: async () => {
      if (!studentId) return
      const existingGrid = await db.grids.get(studentId)
      if (!existingGrid) return
      
      const updatedGrid: StudentGrid = {
        ...existingGrid,
        completedAt: new Date(),
      }
      await db.grids.put(updatedGrid, activeProjectId || undefined)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grid', studentId] })
      queryClient.invalidateQueries({ queryKey: ['grids', activeProjectId] })
    },
  })

  const markAsIncomplete = useMutation({
    mutationFn: async () => {
      if (!studentId) return
      const existingGrid = await db.grids.get(studentId)
      if (!existingGrid) return
      
      const updatedGrid: StudentGrid = {
        ...existingGrid,
        completedAt: null,
      }
      await db.grids.put(updatedGrid, activeProjectId || undefined)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grid', studentId] })
      queryClient.invalidateQueries({ queryKey: ['grids', activeProjectId] })
    },
  })

  const updateTestDateOverride = useMutation({
    mutationFn: async (testDateOverride: string | undefined) => {
      if (!studentId) return
      const existingGrid = await db.grids.get(studentId)
      
      // Si la grille n'existe pas encore, on la crée avec des valeurs par défaut
      if (!existingGrid) {
        const totals = calculateGridTotals(objectives, [])
        const grid: StudentGrid = {
          studentId,
          evaluations: [],
          totalPoints: totals.totalPoints,
          maxPoints: totals.maxPoints,
          finalGrade: calculateFinalGrade(
            totals.totalPoints,
            totals.maxPoints,
            settings.threshold,
            settings.correctionError,
          ),
          moduleName: settings.moduleName,
          moduleDescription: settings.moduleDescription,
          testDate: settings.testDate,
          testDateOverride,
          correctedBy: settings.correctedBy,
          generatedAt: new Date(),
          completedAt: null,
        }
        await db.grids.put(grid, activeProjectId || undefined)
        return
      }
      
      const updatedGrid: StudentGrid = {
        ...existingGrid,
        testDateOverride,
      }
      await db.grids.put(updatedGrid, activeProjectId || undefined)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grid', studentId] })
      queryClient.invalidateQueries({ queryKey: ['grids', activeProjectId] })
    },
  })

  return {
    grid: gridQuery.data,
    isLoading: gridQuery.isLoading,
    saveGrid,
    markAsCompleted,
    markAsIncomplete,
    updateTestDateOverride,
    saveStatus,
  }
}
