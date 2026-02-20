import { Fragment, useEffect, useState } from 'react'
import { calculateIndicatorPoints } from '../../lib/calculations'
import { exportSynthesisWorkbook } from '../../lib/excel-utils'
import { generateBatchZip, generateStudentPdfBlob } from '../../lib/pdf-generator'
import type { Objective, Student, StudentGrid } from '../../types'

interface SynthesisViewProps {
  objectives: Objective[]
  students: Student[]
  grids: StudentGrid[]
  testDate?: string
  testIdentifier?: string
  moduleName?: string
  correctedBy?: string
}

const colorForScore = (score: number | null | undefined) => {
  if (score === null || score === undefined) return 'bg-white text-slate-300'
  if (score === 0) return 'bg-red-100 text-red-700'
  if (score === 1) return 'bg-orange-100 text-orange-700'
  if (score === 2) return 'bg-amber-100 text-amber-700'
  if (score === 3) return 'bg-emerald-100 text-emerald-700'
  return 'bg-white'
}

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export const SynthesisView = ({ objectives, students, grids, testDate, testIdentifier = 'C216', moduleName = 'Module', correctedBy = '' }: SynthesisViewProps) => {
  const [isExporting, setIsExporting] = useState(false)
  const [openMenuStudentId, setOpenMenuStudentId] = useState<string | null>(null)

  // Filtrer pour n'afficher que les élèves ayant au moins une grille (évalués)
  const evaluatedStudents = students.filter(student => 
    grids.some(grid => grid.studentId === student.id)
  )

  // Fermer le menu quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (openMenuStudentId && !(e.target as Element).closest('.student-menu-container')) {
        setOpenMenuStudentId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openMenuStudentId])

  const exportExcel = () => {
    const blob = exportSynthesisWorkbook(objectives, students, grids)
    downloadBlob(blob, 'Synthese-Classe.xlsx')
  }

  const exportPdfBatch = async () => {
    setIsExporting(true)
    try {
      // HAUTE FIX #20: Use only evaluated students to match table display
      const result = await generateBatchZip(evaluatedStudents, grids, objectives, testIdentifier, moduleName, correctedBy, testDate)
      downloadBlob(result.blob, result.fileName)
    } finally {
      setIsExporting(false)
    }
  }

  const viewStudentPdf = async (student: Student) => {
    const grid = grids.find(g => g.studentId === student.id)
    if (!grid) return

    try {
      const blob = await generateStudentPdfBlob(student, grid, objectives, testIdentifier, moduleName, correctedBy, testDate)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      // L'URL sera révoquée quand l'onglet sera fermé
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error)
      alert('Erreur lors de la génération du PDF')
    }
  }

  if (evaluatedStudents.length === 0) {
    return (
      <section className="space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <div className="text-4xl mb-3 opacity-30">📊</div>
          <h3 className="text-lg font-semibold text-slate-700 mb-1">Aucune donnée</h3>
          <p className="text-sm text-slate-400">
            {students.length === 0 
              ? 'Ajoutez des élèves pour commencer.' 
              : 'Évaluez des élèves pour voir la synthèse de classe.'
            }
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-5">
      {/* HEADER */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Synthèse de classe</h2>
            <p className="text-xs text-slate-500 mt-1">
              {evaluatedStudents.length} élève{evaluatedStudents.length > 1 ? 's' : ''} évalué{evaluatedStudents.length > 1 ? 's' : ''} · {objectives.length} objectif{objectives.length > 1 ? 's' : ''} · {objectives.reduce((sum, o) => sum + o.indicators.length, 0)} question{objectives.reduce((sum, o) => sum + o.indicators.length, 0) > 1 ? 's' : ''}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={exportExcel}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all active:scale-95"
            >
              Export Excel
            </button>
            
            <button 
              onClick={exportPdfBatch} 
              disabled={isExporting}
              className={`
                flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all
                ${isExporting 
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm active:scale-95'
                }
              `}
            >
              {isExporting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Export...
                </>
              ) : (
                'Export PDF (ZIP)'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-white text-xs uppercase tracking-wider sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left font-semibold min-w-56 border-r border-slate-700">
                  Objectif / Question
                </th>
                {evaluatedStudents.map((student) => (
                  <th 
                    key={student.id} 
                    className="px-2 py-3 text-center font-semibold border-l border-slate-700 min-w-28 relative"
                  >
                    <div className="truncate max-w-24 mx-auto" title={`${student.lastname} ${student.firstname}`}>
                      {student.lastname}
                    </div>
                    <div className="text-[10px] font-normal text-slate-400 truncate max-w-24 mx-auto mb-1">
                      {student.firstname}
                    </div>
                    
                    {/* Bouton menu 3 points */}
                    <div className="student-menu-container absolute top-2 right-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenMenuStudentId(openMenuStudentId === student.id ? null : student.id)
                        }}
                        className="p-1.5 hover:bg-slate-700 rounded-md transition-colors opacity-60 hover:opacity-100"
                        title="Actions"
                      >
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
                          <circle cx="8" cy="2.5" r="1.5" />
                          <circle cx="8" cy="8" r="1.5" />
                          <circle cx="8" cy="13.5" r="1.5" />
                        </svg>
                      </button>
                      
                      {/* Menu déroulant */}
                      {openMenuStudentId === student.id && (
                        <div className="absolute top-full right-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-xl z-50 min-w-40 overflow-hidden">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              viewStudentPdf(student)
                              setOpenMenuStudentId(null)
                            }}
                            className="w-full px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2.5 transition-colors"
                          >
                            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span className="font-medium">Voir le PDF</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {objectives.map((objective) => (
                <Fragment key={objective.id}>
                  {/* INDICATORS */}
                  {objective.indicators.map((indicator, idx) => (
                    <tr 
                      key={`${objective.id}-${indicator.id}`}
                      className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}
                    >
                      <td className="px-4 py-2.5 border-r border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <span className="shrink-0 w-6 h-6 bg-slate-200 rounded text-[10px] font-bold text-slate-600 flex items-center justify-center">
                              O{objective.number}
                            </span>
                            {indicator.questionNumber && (
                              <span className="shrink-0 w-6 h-6 bg-emerald-100 rounded text-[10px] font-bold text-emerald-700 flex items-center justify-center">
                                Q{indicator.questionNumber}
                              </span>
                            )}
                          </div>
                          <span className="text-slate-700 text-xs truncate" title={indicator.behavior}>
                            {indicator.behavior}
                          </span>
                        </div>
                      </td>
                      {evaluatedStudents.map((student) => {
                        const grid = grids.find((entry) => entry.studentId === student.id)
                        const evaluation = grid?.evaluations.find(
                          (entry) => entry.objectiveId === objective.id && entry.indicatorId === indicator.id,
                        )
                        return (
                          <td
                            key={`${student.id}-${objective.id}-${indicator.id}`}
                            className={`px-2 py-2.5 text-center border-l border-slate-100 ${colorForScore(evaluation?.score)}`}
                          >
                            <span className="font-bold text-sm">
                              {evaluation?.score ?? '—'}
                            </span>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                  
                  {/* OBJECTIVE TOTAL ROW */}
                  <tr className="bg-slate-100 border-y-2 border-slate-200 font-semibold">
                    <td className="px-4 py-2.5 border-r border-slate-200">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 bg-blue-600 text-white rounded text-[10px] flex items-center justify-center font-bold">
                          Σ
                        </span>
                        <span className="text-xs text-slate-800">Total O{objective.number}</span>
                      </div>
                    </td>
                    {evaluatedStudents.map((student) => {
                      const grid = grids.find((entry) => entry.studentId === student.id)
                      const total = objective.indicators.reduce((sum, indicator) => {
                        const evaluation = grid?.evaluations.find(
                          (entry) => entry.objectiveId === objective.id && entry.indicatorId === indicator.id,
                        )
                        if (evaluation?.score === null || evaluation?.score === undefined) {
                          return sum
                        }
                        return sum + calculateIndicatorPoints(indicator.weight * objective.weight, evaluation.score)
                      }, 0)
                      return (
                        <td 
                          key={`${student.id}-${objective.id}-total`} 
                          className="px-2 py-2.5 text-center border-l border-slate-200 text-sm font-bold text-slate-800"
                        >
                          {total?.toFixed(1) ?? '—'}
                        </td>
                      )
                    })}
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* LEGEND */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <span className="font-semibold text-slate-700">Légende :</span>
        {[
          { color: 'bg-red-100 border-red-200', label: '0 (Insuffisant)' },
          { color: 'bg-orange-100 border-orange-200', label: '1 (Partiel)' },
          { color: 'bg-amber-100 border-amber-200', label: '2 (Satisfaisant)' },
          { color: 'bg-emerald-100 border-emerald-200', label: '3 (Excellent)' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span className={`w-4 h-4 ${item.color} border rounded`} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}