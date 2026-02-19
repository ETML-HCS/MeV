import { useMemo } from 'react'
import { useAppStore } from '../stores/useAppStore'
import { toAcademicYearLabel } from '../utils/helpers'

export const useAcademicYear = () => {
  const academicYear = useAppStore((state) => state.academicYear)

  return useMemo(
    () => ({
      academicYear,
      label: toAcademicYearLabel(academicYear),
    }),
    [academicYear],
  )
}
