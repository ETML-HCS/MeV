import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { calculateFinalGrade, calculateGridTotals, calculateIndicatorPoints } from '../../lib/calculations'
import type { Evaluation, Objective, Student, StudentGrid } from '../../types'

interface EvaluationViewProps {
  students: Student[]
  objectives: Objective[]
  selectedStudentId: string | null
  onSelectStudent: (studentId: string) => void
  initialEvaluations: Evaluation[]
  threshold: number
  correctionError: number
  showObjectives: boolean
  readOnly: boolean
  maxQuestionsToAnswer: number | null // null = toutes les questions
  currentGrid: StudentGrid | null | undefined
  grids: StudentGrid[]
  viewMode: 'objectives' | 'questions'
  onChangeViewMode: (mode: 'objectives' | 'questions') => void
  onSave: (evaluations: Evaluation[]) => void
  onMarkAsCompleted: () => void
  onMarkAsIncomplete: () => void
  onUpdateTestDateOverride: (date: string | undefined) => void
}

const SCORE_OPTIONS = [
  { value: 3, label: '3', color: 'bg-emerald-500', textColor: 'text-white', ringClass: 'ring-emerald-200', desc: 'Excellent' },
  { value: 2, label: '2', color: 'bg-amber-400', textColor: 'text-white', ringClass: 'ring-amber-200', desc: 'Satisfaisant' },
  { value: 1, label: '1', color: 'bg-orange-400', textColor: 'text-white', ringClass: 'ring-orange-200', desc: 'Partiel' },
  { value: 0, label: '0', color: 'bg-red-500', textColor: 'text-white', ringClass: 'ring-red-200', desc: 'Insuffisant' },
] as const

const gradeColor = (grade: number) => {
  if (grade >= 5.5) return 'text-emerald-600'
  if (grade >= 4.0) return 'text-blue-600'
  if (grade >= 3.5) return 'text-amber-600'
  return 'text-red-600'
}

export const EvaluationView = ({
  students,
  objectives,
  selectedStudentId,
  onSelectStudent,
  initialEvaluations,
  threshold,
  correctionError,
  showObjectives,
  readOnly,
  maxQuestionsToAnswer,
  currentGrid,
  grids,
  viewMode,
  onChangeViewMode,
  onSave,
  onMarkAsCompleted,
  onMarkAsIncomplete,
  onUpdateTestDateOverride,
}: EvaluationViewProps) => {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [showOnlyUngraded, setShowOnlyUngraded] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [focusCursor, setFocusCursor] = useState(0)
  const [showScrollButtons, setShowScrollButtons] = useState(false)
  const [hasAlternateDate, setHasAlternateDate] = useState(false)
  const [alternateDate, setAlternateDate] = useState('')
  const [showDateInput, setShowDateInput] = useState(false)
  const [collapsedObjectiveIds, setCollapsedObjectiveIds] = useState<string[]>([])

  const hydratedStudentIdRef = useRef<string | null>(null)
  const lastSavedSignatureRef = useRef<string>('')
  const skipNextAutosaveRef = useRef(false)

  // Calculer les évaluations en fonction de l'étudiant sélectionné
  const computedEvaluations = useMemo(() => {
    if (!selectedStudentId) {
      return []
    }
    return initialEvaluations
  }, [selectedStudentId, initialEvaluations])

  // Synchroniser l'état local avec les évaluations calculées
  useLayoutEffect(() => {
    const studentChanged = hydratedStudentIdRef.current !== selectedStudentId
    
    // Ne réinitialiser que si l'étudiant a changé OU si c'est vraiment de nouvelles données
    // (pas juste un refetch de ce qu'on vient de sauvegarder)
    const incomingSignature = JSON.stringify(computedEvaluations)
    const isReallyNewData = incomingSignature !== lastSavedSignatureRef.current
    
    if (studentChanged) {
      hydratedStudentIdRef.current = selectedStudentId
      lastSavedSignatureRef.current = incomingSignature
      skipNextAutosaveRef.current = true
      if (JSON.stringify(evaluations) !== incomingSignature) {
        setEvaluations(computedEvaluations)
      }
    } else if (isReallyNewData && evaluations.length === 0) {
      // Accepter les données tardives seulement si on a vraiment rien localement
      lastSavedSignatureRef.current = incomingSignature
      skipNextAutosaveRef.current = true
      if (JSON.stringify(evaluations) !== incomingSignature) {
        setEvaluations(computedEvaluations)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudentId, computedEvaluations])

  // Synchroniser la date alternative avec la grille courante
  useEffect(() => {
    if (currentGrid?.testDateOverride !== undefined) {
      setHasAlternateDate(true)
      setAlternateDate(currentGrid.testDateOverride || '')
      setShowDateInput(!!currentGrid.testDateOverride)
    } else {
      setHasAlternateDate(false)
      setAlternateDate('')
      setShowDateInput(false)
    }
  }, [currentGrid])

  // Détecter le scroll pour afficher les boutons
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollButtons(window.scrollY > 300)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (readOnly) return
    if (skipNextAutosaveRef.current) {
      skipNextAutosaveRef.current = false
      return
    }
    const signature = JSON.stringify(evaluations)
    if (signature === lastSavedSignatureRef.current) {
      return
    }
    const timer = setTimeout(() => {
      lastSavedSignatureRef.current = signature
      onSave(evaluations)
    }, 400)
    return () => clearTimeout(timer)
  }, [evaluations, onSave, readOnly])

  const totals = useMemo(() => calculateGridTotals(objectives, evaluations), [objectives, evaluations])
  // HAUTE FIX #18: Memoize finalGrade calculation
  const finalGrade = useMemo(
    () => calculateFinalGrade(totals.totalPoints, totals.maxPoints, threshold, correctionError),
    [totals.totalPoints, totals.maxPoints, threshold, correctionError]
  )

  const fallbackQuestionNumberMap = useMemo(() => {
    const map = new Map<string, number>()
    let counter = 1
    objectives.forEach((objective) => {
      objective.indicators.forEach((indicator) => {
        if (!map.has(indicator.id)) {
          map.set(indicator.id, counter)
          counter += 1
        }
      })
    })
    return map
  }, [objectives])

  const evaluationIndex = useMemo(() => {
    return new Map(evaluations.map((evaluation) => [`${evaluation.objectiveId}__${evaluation.indicatorId}`, evaluation]))
  }, [evaluations])

  const indicatorStats = useMemo(() => {
    let selectedCount = 0
    let gradedCount = 0
    let gradedSelectedCount = 0

    objectives.forEach((objective) => {
      objective.indicators.forEach((indicator) => {
        const key = `${objective.id}__${indicator.id}`
        const evaluation = evaluationIndex.get(key)
        const isSelected = evaluation?.selected !== false
        const isGraded = evaluation?.score !== null && evaluation?.score !== undefined

        if (isSelected) selectedCount += 1
        if (isGraded) gradedCount += 1
        if (isSelected && isGraded) gradedSelectedCount += 1
      })
    })

    return { selectedCount, gradedCount, gradedSelectedCount }
  }, [objectives, evaluationIndex])

  const totalIndicators = objectives.reduce((sum, o) => sum + o.indicators.length, 0)
  const selectedQuestionsCount = indicatorStats.selectedCount

  const currentIndex = students.findIndex(s => s.id === selectedStudentId)
  const canPrev = currentIndex > 0
  const canNext = currentIndex < students.length - 1 && currentIndex >= 0

  // Calculer le nombre d'élèves évalués
  const evaluatedStudentIds = useMemo(() => {
    const ids = new Set<string>()
    grids.forEach(grid => {
      // Un élève est considéré comme évalué s'il a au moins une évaluation
      if (grid.evaluations && grid.evaluations.length > 0) {
        ids.add(grid.studentId)
      }
    })
    return ids
  }, [grids])

  const evaluatedCount = evaluatedStudentIds.size

  const requiredQuestions = maxQuestionsToAnswer !== null
    ? Math.min(maxQuestionsToAnswer, totalIndicators)
    : totalIndicators
  const progressRatio = requiredQuestions > 0
    ? Math.min(1, indicatorStats.gradedSelectedCount / requiredQuestions)
    : 0
  const progressPercent = progressRatio * 100
  const hasTooManySelected = maxQuestionsToAnswer !== null && selectedQuestionsCount > maxQuestionsToAnswer
  const canComplete = !readOnly && !hasTooManySelected && requiredQuestions > 0 && indicatorStats.gradedSelectedCount >= requiredQuestions

  const indicatorLookup = useMemo(() => {
    const map = new Map<string, { objective: Objective; indicator: Objective['indicators'][number]; localIndex: number }>()
    objectives.forEach((objective) => {
      objective.indicators.forEach((indicator, index) => {
        map.set(`${objective.id}__${indicator.id}`, { objective, indicator, localIndex: index })
      })
    })
    return map
  }, [objectives])

  const indicatorRows = useMemo(() => {
    const rows = objectives.flatMap((objective) =>
      objective.indicators.map((indicator, index) => ({
        key: `${objective.id}__${indicator.id}`,
        objectiveId: objective.id,
        indicatorId: indicator.id,
        index,
        questionNumber:
          indicator.questionNumber ??
          fallbackQuestionNumberMap.get(indicator.id) ??
          index + 1,
      })),
    )

    if (viewMode === 'questions') {
      return [...rows].sort((a, b) => (a.questionNumber ?? 0) - (b.questionNumber ?? 0))
    }

    return rows
  }, [objectives, fallbackQuestionNumberMap, viewMode])

  const isIndicatorUngraded = (objectiveId: string, indicatorId: string) => {
    const existing = evaluations.find(
      (entry) => entry.objectiveId === objectiveId && entry.indicatorId === indicatorId,
    )
    return existing?.score === null || existing?.score === undefined
  }

  const visibleIndicatorKeys = useMemo(
    () =>
      indicatorRows
        .filter((row) => !showOnlyUngraded || isIndicatorUngraded(row.objectiveId, row.indicatorId))
        .map((row) => row.key),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [indicatorRows, showOnlyUngraded, evaluations],
  )

  const visibleIndicatorKeySet = useMemo(() => new Set(visibleIndicatorKeys), [visibleIndicatorKeys])
  const focusedKey = focusMode ? visibleIndicatorKeys[focusCursor] ?? null : null
  const totalVisibleQuestions = visibleIndicatorKeys.length
  const totalUngradedQuestions = indicatorRows.filter((row) => isIndicatorUngraded(row.objectiveId, row.indicatorId)).length

  useEffect(() => {
    if (!focusMode) return
    setFocusCursor((prev) => {
      if (totalVisibleQuestions === 0) return 0
      if (prev >= totalVisibleQuestions) return totalVisibleQuestions - 1
      if (prev < 0) return 0
      return prev
    })
     
  }, [totalVisibleQuestions, focusMode])

  const upsertEvaluation = (next: Evaluation) => {
    setEvaluations((prev) => {
      const index = prev.findIndex(
        (entry) => entry.objectiveId === next.objectiveId && entry.indicatorId === next.indicatorId,
      )
      if (index === -1) return [...prev, next]
      const clone = [...prev]
      clone[index] = next
      return clone
    })
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleNextStudent = () => {
    if (canNext) {
      onSelectStudent(students[currentIndex + 1].id)
      scrollToTop()
    }
  }

  // HAUTE FIX #17: Add scrollToTop for previous navigation
  const handlePrevStudent = () => {
    if (canPrev) {
      onSelectStudent(students[currentIndex - 1].id)
      scrollToTop()
    }
  }

  const handleAlternateDateToggle = (checked: boolean) => {
    setHasAlternateDate(checked)
    if (!checked) {
      setAlternateDate('')
      setShowDateInput(false)
      onUpdateTestDateOverride(undefined)
    } else {
      onUpdateTestDateOverride('')
    }
  }

  const handleAlternateDateChange = (date: string) => {
    setAlternateDate(date)
    onUpdateTestDateOverride(date)
  }

  const setScoreForIndicator = (objectiveId: string, indicatorId: string, score: 0 | 1 | 2 | 3 | null) => {
    const objective = objectives.find((entry) => entry.id === objectiveId)
    const indicator = objective?.indicators.find((entry) => entry.id === indicatorId)
    if (!objective || !indicator) return

    const existing = evaluations.find(
      (entry) => entry.objectiveId === objectiveId && entry.indicatorId === indicatorId,
    )

    // Si on attribue un score, la question doit être sélectionnée
    // Si on retire le score (null), on garde le statut de sélection actuel
    const shouldBeSelected = score !== null ? true : (existing?.selected ?? (maxQuestionsToAnswer === null))

    upsertEvaluation({
      objectiveId,
      indicatorId,
      score,
      customRemark: existing?.customRemark ?? '',
      calculatedPoints: score === null ? 0 : calculateIndicatorPoints(indicator.weight * objective.weight, score),
      selected: shouldBeSelected,
    })
  }

  const goToNextFocus = () => {
    if (totalVisibleQuestions <= 1) return
    setFocusCursor((prev) => (prev + 1) % totalVisibleQuestions)
  }

  const goToPreviousFocus = () => {
    if (totalVisibleQuestions <= 1) return
    setFocusCursor((prev) => (prev - 1 + totalVisibleQuestions) % totalVisibleQuestions)
  }

  const toggleObjectiveCollapse = (objectiveId: string) => {
    setCollapsedObjectiveIds((prev) =>
      prev.includes(objectiveId) ? prev.filter((id) => id !== objectiveId) : [...prev, objectiveId],
    )
  }

  const collapseAllObjectives = () => {
    setCollapsedObjectiveIds(objectives.map((objective) => objective.id))
  }

  const expandAllObjectives = () => {
    setCollapsedObjectiveIds([])
  }

  const jumpToNextUngraded = () => {
    const ungradedKeys = indicatorRows
      .filter((row) => isIndicatorUngraded(row.objectiveId, row.indicatorId))
      .map((row) => row.key)
    if (ungradedKeys.length === 0) return

    const currentIndexInUngraded = focusedKey ? ungradedKeys.indexOf(focusedKey) : -1
    const nextUngradedKey = ungradedKeys[(currentIndexInUngraded + 1) % ungradedKeys.length]

    setShowOnlyUngraded(true)
    setFocusMode(true)
    setFocusCursor(ungradedKeys.indexOf(nextUngradedKey))
  }

  useEffect(() => {
    if (readOnly) return

    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return

      // Global shortcuts
      if (event.key === 'ArrowRight' && event.ctrlKey) {
        event.preventDefault()
        handleNextStudent()
        return
      }
      if (event.key === 'ArrowLeft' && event.ctrlKey) {
        event.preventDefault()
        handlePrevStudent()
        return
      }
      if (event.key.toLowerCase() === 'o' && event.ctrlKey) {
        event.preventDefault()
        onChangeViewMode('objectives')
        return
      }
      if (event.key.toLowerCase() === 'q' && event.ctrlKey) {
        event.preventDefault()
        onChangeViewMode('questions')
        return
      }

      if (!focusMode || !focusedKey) return

      const [objectiveId, indicatorId] = focusedKey.split('__')
      if (!objectiveId || !indicatorId) return

      if (['0', '1', '2', '3'].includes(event.key)) {
        event.preventDefault()
        const nextScore = Number(event.key) as 0 | 1 | 2 | 3
        const existing = evaluations.find(
          (entry) => entry.objectiveId === objectiveId && entry.indicatorId === indicatorId,
        )
        const score = existing?.score === nextScore ? null : nextScore
        setScoreForIndicator(objectiveId, indicatorId, score)
      }

      if (event.key === 'Enter') {
        event.preventDefault()
        goToNextFocus()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusMode, focusedKey, evaluations, readOnly, objectives, totalVisibleQuestions, canNext, canPrev, currentIndex, students])

  return (
    <section className="space-y-5">
      {/* STUDENT NAVIGATION BAR */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3.5 lg:p-4">
        <div className="flex items-center gap-4">
          {/* Prev/Next */}
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevStudent}
              disabled={!canPrev}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="Élève précédent (Ctrl+←)"
            >
              ‹
            </button>
            <button
              onClick={() => canNext && onSelectStudent(students[currentIndex + 1].id)}
              disabled={!canNext}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="Élève suivant (Ctrl+→)"
            >
              ›
            </button>
          </div>

          {/* Student selector */}
          <select
            value={selectedStudentId ?? ''}
            onChange={(event) => onSelectStudent(event.target.value)}
            className="flex-1 max-w-sm rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white"
            aria-label="Sélection élève"
          >
            <option value="">— Sélectionner un élève —</option>
            {students.map((student, idx) => {
              const isEvaluated = evaluatedStudentIds.has(student.id)
              return (
                <option 
                  key={student.id} 
                  value={student.id}
                  style={!isEvaluated ? { color: '#ef4444' } : undefined}
                >
                  {isEvaluated ? '✓ ' : '✗ '}{idx + 1}. {student.lastname} {student.firstname}
                </option>
              )
            })}
          </select>

          {/* Student count badge */}
          <span className="text-xs text-slate-400 font-medium">
            {evaluatedCount}/{students.length} élèves
          </span>

          {/* Alternate date for absent student */}
          {selectedStudentId && (
            <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasAlternateDate}
                  onChange={(e) => handleAlternateDateToggle(e.target.checked)}
                  disabled={readOnly}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
                />
                <span className="text-xs text-slate-500">Absent</span>
              </label>
              {hasAlternateDate && !showDateInput && (
                <button
                  onClick={() => setShowDateInput(true)}
                  disabled={readOnly}
                  className="text-[10px] text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors disabled:opacity-50"
                >
                  + Date de rattrapage
                </button>
              )}
              {hasAlternateDate && showDateInput && (
                <div className="flex items-center gap-1">
                  <input
                    type="date"
                    value={alternateDate}
                    onChange={(e) => handleAlternateDateChange(e.target.value)}
                    disabled={readOnly}
                    className="text-xs border border-slate-300 rounded-lg px-2 py-1 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none disabled:opacity-50"
                  />
                  <button
                    onClick={() => {
                      setShowDateInput(false)
                      setAlternateDate('')
                      onUpdateTestDateOverride('')
                    }}
                    disabled={readOnly}
                    className="text-slate-400 hover:text-rose-500 p-1 rounded hover:bg-rose-50 transition-colors disabled:opacity-50"
                    title="Retirer la date"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Score summary */}
          <div className="flex items-center gap-5">
            <div className="text-right">
              <div className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Points</div>
              <div className="text-lg font-bold text-slate-900 leading-tight">
                {totals.totalPoints.toFixed(1)} <span className="text-sm text-slate-400 font-normal">/ {totals.maxPoints.toFixed(0)}</span>
              </div>
            </div>
            {maxQuestionsToAnswer !== null && (
              <>
                <div className="h-10 w-px bg-slate-200" />
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Questions</div>
                  <div className={`text-lg font-bold leading-tight ${
                    selectedQuestionsCount > maxQuestionsToAnswer 
                      ? 'text-red-600' 
                      : selectedQuestionsCount === maxQuestionsToAnswer 
                        ? 'text-emerald-600' 
                        : 'text-slate-900'
                  }`}>
                    {selectedQuestionsCount} <span className="text-sm text-slate-400 font-normal">/ {maxQuestionsToAnswer}</span>
                  </div>
                </div>
              </>
            )}
            <div className="h-10 w-px bg-slate-200" />
            <div className="text-right">
              <div className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Note</div>
              <div className={`text-2xl font-black leading-tight ${Number.isFinite(finalGrade) ? gradeColor(finalGrade) : 'text-slate-300'}`}>
                {Number.isFinite(finalGrade) ? finalGrade.toFixed(1) : '—'}
              </div>
            </div>
            <div className="h-10 w-px bg-slate-200" />
            {/* Completion status */}
            <div>
              {currentGrid?.completedAt ? (
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={onMarkAsIncomplete}
                    disabled={readOnly}
                    className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-lg hover:bg-emerald-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                    title="Cliquer pour rouvrir l'évaluation"
                  >
                    <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5 13l4 4L19 7" />
                    </svg>
                    Terminé
                  </button>
                  <div className="text-[9px] text-slate-400 text-center">
                    {new Date(currentGrid.completedAt).toLocaleDateString('fr-FR', { 
                      day: '2-digit', 
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              ) : (
                <button
                  onClick={onMarkAsCompleted}
                  disabled={!canComplete}
                  className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                  title={!canComplete ? "Complétez les questions requises d'abord" : "Marquer comme terminé"}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Terminer
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        {selectedStudentId && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                Progression
              </span>
              <span className="text-[11px] font-semibold text-slate-500">
                {indicatorStats.gradedSelectedCount}/{requiredQuestions} questions évaluées
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  progressPercent === 100 ? 'bg-emerald-500' : 'bg-blue-500'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {selectedStudentId && showObjectives && (
          <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
            {/* Toggle Q/O */}
            <button
              onClick={() => {
                const next = viewMode === 'objectives' ? 'questions' : 'objectives'
                onChangeViewMode(next)
              }}
              className="relative flex items-center w-18 h-7 rounded-md border border-slate-300 bg-white shadow-sm overflow-hidden transition-all hover:border-blue-400 group"
              title={viewMode === 'objectives' ? 'Passer en vue Questions (Ctrl+Q)' : 'Passer en vue Objectifs (Ctrl+O)'}
            >
              <span className={`absolute inset-y-0 w-1/2 rounded m-0.5 transition-all duration-200 ${
                viewMode === 'objectives' ? 'left-0 bg-slate-900' : 'left-1/2 bg-slate-900'
              }`} />
              <span className={`relative z-10 flex-1 text-center text-[10px] font-bold transition-colors ${
                viewMode === 'objectives' ? 'text-white' : 'text-slate-500 group-hover:text-slate-700'
              }`}>O</span>
              <span className={`relative z-10 flex-1 text-center text-[10px] font-bold transition-colors ${
                viewMode === 'questions' ? 'text-white' : 'text-slate-500 group-hover:text-slate-700'
              }`}>Q</span>
            </button>
            <button
              onClick={() => setFocusMode((prev) => !prev)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-all ${
                focusMode
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Mode focus
            </button>
            <button
              onClick={() => setShowOnlyUngraded((prev) => !prev)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-all ${
                showOnlyUngraded
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Non notées uniquement ({totalUngradedQuestions})
            </button>
            <button
              onClick={jumpToNextUngraded}
              disabled={totalUngradedQuestions === 0}
              className="px-2.5 py-1 text-xs font-semibold rounded-md border bg-white text-slate-600 border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Prochaine non notée
            </button>
            {viewMode === 'objectives' && (
              <>
                <button
                  onClick={expandAllObjectives}
                  className="px-2.5 py-1 text-xs font-semibold rounded-md border bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                >
                  Tout déplier
                </button>
                <button
                  onClick={collapseAllObjectives}
                  className="px-2.5 py-1 text-xs font-semibold rounded-md border bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                >
                  Tout replier
                </button>
              </>
            )}

            {focusMode && (
              <div className="ml-auto flex items-center gap-2">
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded-md text-[10px] text-blue-600 font-medium">
                  <kbd className="px-1 py-0.5 bg-white border border-blue-200 rounded text-[10px] font-mono">0-3</kbd> noter
                  <kbd className="px-1 py-0.5 bg-white border border-blue-200 rounded text-[10px] font-mono ml-1">↵</kbd> suivant
                  <kbd className="px-1 py-0.5 bg-white border border-blue-200 rounded text-[10px] font-mono ml-1">Ctrl+→</kbd> élève suiv.
                </span>
                <button
                  onClick={goToPreviousFocus}
                  disabled={totalVisibleQuestions <= 1}
                  className="px-2 py-1 text-xs font-semibold rounded-md border bg-white text-slate-600 border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ←
                </button>
                <span className="text-xs text-slate-500 min-w-20 text-center">
                  {totalVisibleQuestions === 0 ? '0/0' : `${focusCursor + 1}/${totalVisibleQuestions}`}
                </span>
                <button
                  onClick={goToNextFocus}
                  disabled={totalVisibleQuestions <= 1}
                  className="px-2 py-1 text-xs font-semibold rounded-md border bg-white text-slate-600 border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* OVER LIMIT WARNING */}
      {selectedStudentId && maxQuestionsToAnswer !== null && hasTooManySelected && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <span className="w-8 h-8 rounded-lg bg-red-100 border border-red-200 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 9v4m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
            </svg>
          </span>
          <div className="flex-1">
            <div className="text-sm font-semibold text-red-800">Trop de questions sélectionnées</div>
            <div className="text-xs text-red-600">
              L'élève a sélectionné {selectedQuestionsCount} questions sur un maximum de {maxQuestionsToAnswer}. 
              Veuillez décocher {selectedQuestionsCount - maxQuestionsToAnswer} question(s).
            </div>
          </div>
        </div>
      )}

      {/* READ ONLY BANNER */}
      {readOnly && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
          <span className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 9v4m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
            </svg>
          </span>
          <div>
            <div className="text-sm font-semibold text-amber-800">Mode lecture seule</div>
            <div className="text-xs text-amber-600">Les onglets élèves sont verrouillés. Déverrouillez depuis le Dashboard.</div>
          </div>
        </div>
      )}

      {/* NO STUDENT SELECTED */}
      {!selectedStudentId && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
            <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 15l-6 6m0 0v-4m0 4h4m6-10a6 6 0 10-12 0c0 2.21 1.343 4.11 3.257 4.927" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-700 mb-1">Sélectionnez un élève</h3>
          <p className="text-sm text-slate-500">Choisissez un élève dans la liste ci-dessus pour commencer l'évaluation</p>
        </div>
      )}

      {/* OBJECTIVES HIDDEN */}
      {selectedStudentId && !showObjectives && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-center">
          <p className="text-sm text-slate-500">L'affichage des objectifs est masqué. Activez-le depuis le Dashboard.</p>
        </div>
      )}

      {/* EVALUATION GRID */}
      {selectedStudentId && showObjectives && viewMode === 'objectives' && (
        <div className="space-y-4">
          {objectives.map((objective) => {
            // Calculate objective progress
            const objEvals = evaluations.filter(e => e.objectiveId === objective.id)
            const objGraded = objEvals.filter(e => e.score !== null).length
            const objTotal = objective.indicators.length
            const objPoints = objEvals.reduce((sum, e) => sum + e.calculatedPoints, 0)
            // HAUTE FIX #5: Include ×3 multiplier for max score
            const objMaxPoints = objective.indicators.reduce(
              (sum, ind) => sum + (ind.weight * objective.weight * 3),
              0
            )
            const visibleIndicators = objective.indicators.filter((indicator) => {
              const key = `${objective.id}__${indicator.id}`
              if (!visibleIndicatorKeySet.has(key)) return false
              if (focusMode && focusedKey && key !== focusedKey) return false
              return true
            })

            if (visibleIndicators.length === 0) return null

            const isCollapsed = !focusMode && collapsedObjectiveIds.includes(objective.id)

            return (
              <article key={objective.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Objective Header */}
                <div className="px-4 py-2.5 bg-linear-to-r from-slate-50 to-white border-b border-slate-200 flex items-center gap-3">
                  <span className="shrink-0 w-7 h-7 bg-slate-900 text-white font-bold text-xs rounded-md flex items-center justify-center shadow-sm">
                    O{objective.number}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 truncate">{objective.title}</h3>
                    {objective.description && (
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{objective.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400">{objGraded}/{objTotal}</span>
                    <div className="text-right">
                      <span className="font-bold text-slate-800">{objPoints.toFixed(1)}</span>
                      <span className="text-slate-400"> / {objMaxPoints.toFixed(0)}</span>
                    </div>
                  </div>
                  {!focusMode && (
                    <button
                      onClick={() => toggleObjectiveCollapse(objective.id)}
                      className="shrink-0 w-7 h-7 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-all"
                      title={isCollapsed ? 'Déplier l’objectif' : 'Replier l’objectif'}
                      aria-label={isCollapsed ? 'Déplier l’objectif' : 'Replier l’objectif'}
                    >
                      {isCollapsed ? '▾' : '▴'}
                    </button>
                  )}
                </div>

                {/* Indicators */}
                {!isCollapsed && (
                <div className="divide-y divide-slate-100">
                  {visibleIndicators.map((indicator) => {
                    const qIdx = objective.indicators.findIndex((entry) => entry.id === indicator.id)
                    const localQuestionNumber = qIdx + 1
                    const displayQuestionNumber = indicator.questionNumber
                      ?? fallbackQuestionNumberMap.get(indicator.id)
                      ?? localQuestionNumber
                    const existing = evaluations.find(
                      (entry) => entry.objectiveId === objective.id && entry.indicatorId === indicator.id,
                    )
                    const currentScore = existing?.score ?? null
                    const isSelected = existing?.selected !== false // Par défaut true si non défini
                    const points =
                      currentScore === null || currentScore === undefined
                        ? 0
                        : calculateIndicatorPoints(indicator.weight * objective.weight, currentScore)

                    return (
                      <div key={indicator.id} className={`px-4 py-3 transition-opacity ${!isSelected ? 'opacity-40' : ''}`}>
                        <div className="flex items-start gap-3">
                          {/* Question selection checkbox */}
                          <div className="shrink-0 flex items-center justify-center w-5 h-7 mt-0.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={readOnly}
                              onChange={(e) => {
                                const newSelected = e.target.checked
                                upsertEvaluation({
                                  objectiveId: objective.id,
                                  indicatorId: indicator.id,
                                  score: existing?.score ?? null,
                                  customRemark: existing?.customRemark ?? '',
                                  calculatedPoints: existing?.calculatedPoints ?? 0,
                                  selected: newSelected,
                                })
                              }}
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                              title={isSelected ? 'Désélectionner cette question' : 'Sélectionner cette question'}
                            />
                          </div>
                          
                          {/* Question badge */}
                          <span className="shrink-0 w-10 h-10 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-md flex flex-col items-center justify-center mt-0.5 leading-tight">
                            <span>O{objective.number}.{localQuestionNumber}</span>
                            <span className="text-[9px] text-slate-500">Q{displayQuestionNumber}</span>
                          </span>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-slate-800">{indicator.behavior}</div>
                            {indicator.expectedResults && (
                              <div className="text-xs text-slate-400 mt-1">Attendu : {indicator.expectedResults}</div>
                            )}
                            
                            {/* Score buttons */}
                            <div className="flex items-center gap-2 mt-2.5">
                              {SCORE_OPTIONS.map((option) => {
                                const isScoreSelected = currentScore === option.value
                                return (
                                  <button
                                    key={option.value}
                                    disabled={readOnly}
                                    onClick={() => {
                                      const score = isScoreSelected ? null : option.value
                                      setScoreForIndicator(objective.id, indicator.id, score as 0 | 1 | 2 | 3 | null)
                                      if (focusMode) {
                                        goToNextFocus()
                                      }
                                    }}
                                    title={`${option.value} pts — ${option.desc}`}
                                    className={`
                                      w-10 h-10 rounded-lg text-sm font-bold transition-all
                                      ${isScoreSelected
                                        ? `${option.color} ${option.textColor} shadow-md scale-110 ring-2 ring-offset-2 ${option.ringClass}`
                                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:scale-105'
                                      }
                                      ${readOnly ? 'cursor-not-allowed' : 'cursor-pointer'}
                                    `}
                                  >
                                    {option.label}
                                  </button>
                                )
                              })}
                            </div>

                            {/* Remark for selected score */}
                            {currentScore !== null && currentScore !== undefined && (
                              <div className="mt-1.5 text-xs text-slate-500 italic">
                                {indicator.remarks[currentScore]}
                              </div>
                            )}

                            {/* Custom remark input */}
                            <input
                              value={existing?.customRemark ?? ''}
                              disabled={readOnly}
                              onChange={(event) =>
                                upsertEvaluation({
                                  objectiveId: objective.id,
                                  indicatorId: indicator.id,
                                  score: existing?.score ?? null,
                                  customRemark: event.target.value,
                                  calculatedPoints:
                                    existing?.score === null || existing?.score === undefined
                                      ? 0
                                      : calculateIndicatorPoints(indicator.weight * objective.weight, existing.score),
                                  selected: existing?.selected ?? (maxQuestionsToAnswer === null),
                                })
                              }
                              placeholder="Remarque personnalisée..."
                              className="mt-1.5 w-full max-w-lg border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-600 placeholder:text-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                          </div>

                          {/* Weight badge */}
                          <div className="shrink-0 text-center">
                            <div className="text-[10px] text-slate-400 uppercase font-medium">Poids</div>
                            <div className="text-xs font-bold text-slate-600 mt-0.5">{indicator.weight}</div>
                            <div className="mt-2 min-w-16 px-2 py-1.5 rounded-md border border-slate-200 bg-white">
                              <div className="text-[9px] uppercase tracking-wide text-slate-400">Points</div>
                              <div className="text-xs font-bold text-slate-700 leading-tight">{points.toFixed(1)} pts</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                )}
              </article>
            )
          })}
        </div>
      )}

      {selectedStudentId && showObjectives && viewMode === 'questions' && (
        <div className="space-y-3">
          {indicatorRows.map((row) => {
            if (!visibleIndicatorKeySet.has(row.key)) return null
            if (focusMode && focusedKey && row.key !== focusedKey) return null

            const entry = indicatorLookup.get(row.key)
            if (!entry) return null

            const { objective, indicator, localIndex } = entry
            const localQuestionNumber = localIndex + 1
            const displayQuestionNumber =
              indicator.questionNumber ?? fallbackQuestionNumberMap.get(indicator.id) ?? localQuestionNumber
            const existing = evaluations.find(
              (item) => item.objectiveId === objective.id && item.indicatorId === indicator.id,
            )
            const currentScore = existing?.score ?? null
            const isSelected = existing?.selected !== false
            const points =
              currentScore === null || currentScore === undefined
                ? 0
                : calculateIndicatorPoints(indicator.weight * objective.weight, currentScore)

            return (
              <article key={row.key} className={`bg-white rounded-xl border border-slate-200 shadow-sm ${!isSelected ? 'opacity-40' : ''}`}>
                <div className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 flex items-center justify-center w-5 h-7 mt-0.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={readOnly}
                        onChange={(event) => {
                          const newSelected = event.target.checked
                          upsertEvaluation({
                            objectiveId: objective.id,
                            indicatorId: indicator.id,
                            score: existing?.score ?? null,
                            customRemark: existing?.customRemark ?? '',
                            calculatedPoints: existing?.calculatedPoints ?? 0,
                            selected: newSelected,
                          })
                        }}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        title={isSelected ? 'Désélectionner cette question' : 'Sélectionner cette question'}
                      />
                    </div>

                    <span className="shrink-0 w-10 h-10 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-md flex flex-col items-center justify-center mt-0.5 leading-tight">
                      <span>O{objective.number}.{localQuestionNumber}</span>
                      <span className="text-[9px] text-slate-500">Q{displayQuestionNumber}</span>
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">
                        Objectif O{objective.number} · {objective.title}
                      </div>
                      <div className="text-sm font-medium text-slate-800 mt-1">{indicator.behavior}</div>
                      {indicator.expectedResults && (
                        <div className="text-xs text-slate-400 mt-1">Attendu : {indicator.expectedResults}</div>
                      )}

                      <div className="flex items-center gap-1.5 mt-2.5">
                        {SCORE_OPTIONS.map((option) => {
                          const isScoreSelected = currentScore === option.value
                          return (
                            <button
                              key={option.value}
                              disabled={readOnly}
                              onClick={() => {
                                const score = isScoreSelected ? null : option.value
                                setScoreForIndicator(objective.id, indicator.id, score as 0 | 1 | 2 | 3 | null)
                                if (focusMode) {
                                  goToNextFocus()
                                }
                              }}
                              title={`${option.value} pts — ${option.desc}`}
                              className={`
                                w-8 h-8 rounded-md text-xs font-bold transition-all
                                ${isScoreSelected
                                  ? `${option.color} ${option.textColor} shadow-md scale-110 ring-2 ring-offset-2 ${option.ringClass}`
                                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:scale-105'
                                }
                                ${readOnly ? 'cursor-not-allowed' : 'cursor-pointer'}
                              `}
                            >
                              {option.label}
                            </button>
                          )
                        })}
                      </div>

                      {currentScore !== null && currentScore !== undefined && (
                        <div className="mt-1.5 text-xs text-slate-500 italic">
                          {indicator.remarks[currentScore]}
                        </div>
                      )}

                      <input
                        value={existing?.customRemark ?? ''}
                        disabled={readOnly}
                        onChange={(event) =>
                          upsertEvaluation({
                            objectiveId: objective.id,
                            indicatorId: indicator.id,
                            score: existing?.score ?? null,
                            customRemark: event.target.value,
                            calculatedPoints:
                              existing?.score === null || existing?.score === undefined
                                ? 0
                                : calculateIndicatorPoints(indicator.weight * objective.weight, existing.score),
                            selected: existing?.selected ?? (maxQuestionsToAnswer === null),
                          })
                        }
                        placeholder="Remarque personnalisée..."
                        className="mt-1.5 w-full max-w-lg border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-600 placeholder:text-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div className="shrink-0 text-center">
                      <div className="text-[10px] text-slate-400 uppercase font-medium">Poids</div>
                      <div className="text-xs font-bold text-slate-600 mt-0.5">{indicator.weight}</div>
                      <div className="mt-2 min-w-16 px-2 py-1.5 rounded-md border border-slate-200 bg-white">
                        <div className="text-[9px] uppercase tracking-wide text-slate-400">Points</div>
                        <div className="text-xs font-bold text-slate-700 leading-tight">{points.toFixed(1)} pts</div>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* FLOATING SCROLL BUTTONS */}
      {showScrollButtons && selectedStudentId && (
        <div className="fixed bottom-8 right-8 flex flex-col gap-3 z-30">
          {/* Scroll to top button */}
          <button
            onClick={scrollToTop}
            className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center group"
            title="Remonter en haut"
            aria-label="Remonter en haut de la page"
          >
            <svg className="w-6 h-6 group-hover:-translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </button>

          {/* Next student button */}
          {canNext && (
            <button
              onClick={handleNextStudent}
              className="relative w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center group"
              title={`Élève suivant : ${students[currentIndex + 1].lastname} ${students[currentIndex + 1].firstname} (Ctrl+→)`}
              aria-label="Passer à l'élève suivant et remonter en haut"
            >
              <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
              <span className="absolute -top-2 -right-2 w-6 h-6 bg-white text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold shadow-md">
                {currentIndex + 2}
              </span>
            </button>
          )}
        </div>
      )}
    </section>
  )
}
