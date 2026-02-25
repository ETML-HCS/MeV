import type { Evaluation, Objective } from '../types'
import { DEFAULT_CORRECTION_ERROR, DEFAULT_THRESHOLD } from '../utils/constants'

export const calculateFinalGrade = (
  totalPoints: number,
  maxPoints: number,
  threshold: number = DEFAULT_THRESHOLD,
  correctionError: number = DEFAULT_CORRECTION_ERROR,
): number => {
  if (maxPoints <= 0) return 1

  // HAUTE FIX #9-10: Clamp threshold and ensure grade is in [1, 6]
  const clampedThreshold = Math.max(0.01, Math.min(0.99, threshold))
  const rate = totalPoints / maxPoints
  let grade: number

  if (rate <= clampedThreshold) {
    grade = 3 * (rate / clampedThreshold) + 1 + correctionError
  } else {
    grade = 2 * ((rate - clampedThreshold) / (1 - clampedThreshold)) + 4 + correctionError
  }

  // Bound grade to [1, 6] per Swiss school system
  return Math.round(Math.max(1, Math.min(6, grade)) * 10) / 10
}

export const calculateIndicatorPoints = (weight: number, score: number): number => weight * score

export const calculateGridTotals = (objectives: Objective[], evaluations: Evaluation[], scoringMode: '0-3' | 'points' = '0-3') => {
  const index = new Map(evaluations.map((evaluation) => [`${evaluation.objectiveId}-${evaluation.indicatorId}`, evaluation]))
  let totalPoints = 0
  let maxPoints = 0

  objectives.forEach((objective) => {
    objective.indicators.forEach((indicator) => {
      const key = `${objective.id}-${indicator.id}`
      const evaluation = index.get(key)
      
      // Ne compter que les questions sélectionnées
      if (!evaluation || evaluation.selected !== false) {
        if (scoringMode === 'points') {
          maxPoints += indicator.weight
          const score = evaluation?.score
          if (score !== null && score !== undefined) {
            totalPoints += score
          }
        } else {
          maxPoints += calculateIndicatorPoints(indicator.weight * objective.weight, 3)
          const score = evaluation?.score
          if (score !== null && score !== undefined) {
            totalPoints += calculateIndicatorPoints(indicator.weight * objective.weight, score)
          }
        }
      }
    })
  })

  return { totalPoints, maxPoints }
}
