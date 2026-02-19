import { describe, expect, it } from 'vitest'
import { calculateFinalGrade, calculateIndicatorPoints } from './calculations'

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
})

describe('calculateIndicatorPoints', () => {
  it('computes weighted points directly from score', () => {
    expect(calculateIndicatorPoints(1, 3)).toBe(3)
  })
})
