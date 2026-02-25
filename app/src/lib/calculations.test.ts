import { describe, expect, it } from 'vitest'
import { calculateFinalGrade, calculateGridTotals, calculateIndicatorPoints } from './calculations'
import type { Objective, Evaluation } from '../types'

describe('calculateFinalGrade', () => {
  it('returns 1.0 for zero points', () => {
    expect(calculateFinalGrade(0, 100, 0.6, 0)).toBe(1)
  })

  it('returns 4.0 at threshold', () => {
    expect(calculateFinalGrade(60, 100, 0.6, 0)).toBe(4)
  })

  it('returns 6.0 at full points', () => {
    expect(calculateFinalGrade(100, 100, 0.6, 0)).toBe(6)
  })

  it('applies correction and one-decimal rounding', () => {
    expect(calculateFinalGrade(75, 100, 0.6, -0.1)).toBe(4.7)
  })

  it('clamps threshold to avoid divide-by-zero extremes', () => {
    expect(calculateFinalGrade(50, 100, 0, 0)).toBeGreaterThan(1)
    expect(calculateFinalGrade(50, 100, 1, 0)).toBeLessThan(6)
  })
})

describe('calculateIndicatorPoints', () => {
  it('computes weighted points directly from score', () => {
    expect(calculateIndicatorPoints(1, 3)).toBe(3)
  })
})

describe('calculateGridTotals', () => {
  it('counts only selected questions and skips missing scores', () => {
    const objectives = [
      {
        id: 'o1',
        number: 1,
        title: 'Objectif 1',
        description: '',
        weight: 1,
        indicators: [
          {
            id: 'i1',
            taxonomy: 'Connaître',
            behavior: 'B1',
            weight: 2,
            conditions: '',
            expectedResults: '',
            remarks: { 0: '', 1: '', 2: '', 3: '' },
            questionNumber: 1,
          },
          {
            id: 'i2',
            taxonomy: 'Connaître',
            behavior: 'B2',
            weight: 1,
            conditions: '',
            expectedResults: '',
            remarks: { 0: '', 1: '', 2: '', 3: '' },
            questionNumber: 2,
          },
        ],
      },
    ]

    const evaluations = [
      { objectiveId: 'o1', indicatorId: 'i1', score: 2, selected: true },
      { objectiveId: 'o1', indicatorId: 'i2', score: 3, selected: false },
    ]

    const totals = calculateGridTotals(objectives as Objective[], evaluations as Evaluation[])

    // maxPoints: only i1 is selected => weight 2 * 1 * 3 = 6
    expect(totals.maxPoints).toBe(6)
    // totalPoints: i1 score 2 => 2 * 2 = 4
    expect(totals.totalPoints).toBe(4)
  })

  it('includes questions with no evaluation as selected by default', () => {
    const objectives = [
      {
        id: 'o1',
        number: 1,
        title: 'Objectif 1',
        description: '',
        weight: 1,
        indicators: [
          {
            id: 'i1',
            taxonomy: 'Connaître',
            behavior: 'B1',
            weight: 1,
            conditions: '',
            expectedResults: '',
            remarks: { 0: '', 1: '', 2: '', 3: '' },
            questionNumber: 1,
          },
        ],
      },
    ]

    const totals = calculateGridTotals(objectives as Objective[], [])

    expect(totals.maxPoints).toBe(3)
    expect(totals.totalPoints).toBe(0)
  })

  it('applies objective weight to totals', () => {
    const objectives = [
      {
        id: 'o1',
        number: 1,
        title: 'Objectif 1',
        description: '',
        weight: 2,
        indicators: [
          {
            id: 'i1',
            taxonomy: 'Connaître',
            behavior: 'B1',
            weight: 1,
            conditions: '',
            expectedResults: '',
            remarks: { 0: '', 1: '', 2: '', 3: '' },
            questionNumber: 1,
          },
        ],
      },
    ]

    const evaluations = [
      { objectiveId: 'o1', indicatorId: 'i1', score: 3, selected: true },
    ]

    const totals = calculateGridTotals(objectives as Objective[], evaluations as Evaluation[])

    expect(totals.maxPoints).toBe(6)
    expect(totals.totalPoints).toBe(6)
  })
})
