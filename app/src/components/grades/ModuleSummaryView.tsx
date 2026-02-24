import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import * as XLSX from 'xlsx'
import { getProjects } from '../../lib/db'
import type { Student, StudentGrid } from '../../types'

interface ModuleSummaryViewProps {
  moduleName: string
  onBack?: () => void
}

interface StudentEpRow {
  id: string
  name: string
  grades: (number | null)[]
  average: number | null
  completedCount: number
}

const formatGrade = (value: number | null) => {
  if (value === null || Number.isNaN(value)) return '-'
  return value.toFixed(2)
}

const gradeColor = (grade: number | null) => {
  if (grade === null) return 'text-slate-300'
  if (grade < 4) return 'text-red-600 font-bold'
  if (grade < 4.5) return 'text-orange-500 font-semibold'
  return 'text-emerald-600 font-semibold'
}

const gradeBg = (grade: number | null) => {
  if (grade === null) return ''
  if (grade < 4) return 'bg-red-50'
  if (grade < 4.5) return 'bg-orange-50'
  return 'bg-emerald-50'
}

export const ModuleSummaryView = ({ moduleName, onBack }: ModuleSummaryViewProps) => {
  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: getProjects,
  })

  // Filtrer les projets de ce module, triés par EP
  const moduleProjects = useMemo(() => {
    const projects = projectsQuery.data ?? []
    return projects
      .filter(p => p.name.trim().toLowerCase() === moduleName.trim().toLowerCase())
      .sort((a, b) => {
        const epA = parseInt(a.settings.testIdentifier?.replace(/\D/g, '') || '0')
        const epB = parseInt(b.settings.testIdentifier?.replace(/\D/g, '') || '0')
        return epA - epB
      })
  }, [projectsQuery.data, moduleName])

  // Construire les données du tableau
  const tableData = useMemo(() => {
    if (moduleProjects.length === 0) return null

    const studentMap = new Map<string, { student: Student; grades: (number | null)[] }>()

    moduleProjects.forEach((project, epIndex) => {
      const gridsByStudent = new Map<string, StudentGrid>()
      project.grids.forEach(g => gridsByStudent.set(g.studentId, g))

      project.students.forEach((student) => {
        const studentKey = `${student.lastname.toLowerCase().trim()}-${student.firstname.toLowerCase().trim()}`
        if (!studentMap.has(studentKey)) {
          studentMap.set(studentKey, {
            student,
            grades: new Array(moduleProjects.length).fill(null),
          })
        }
        const grid = gridsByStudent.get(student.id)
        if (grid?.completedAt) {
          studentMap.get(studentKey)!.grades[epIndex] = grid.finalGrade
        }
      })
    })

    const rows: StudentEpRow[] = Array.from(studentMap.values())
      .map(({ student, grades }) => {
        const validGrades = grades.filter((g): g is number => g !== null)
        const completedCount = validGrades.length
        const average = validGrades.length > 0
          ? validGrades.reduce((sum, g) => sum + g, 0) / validGrades.length
          : null

        return {
          id: student.id,
          name: `${student.lastname} ${student.firstname}`.trim(),
          grades,
          average,
          completedCount,
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name))

    const epAverages = moduleProjects.map((_, epIndex) => {
      const validGrades = rows.map(r => r.grades[epIndex]).filter((g): g is number => g !== null)
      if (validGrades.length === 0) return null
      return validGrades.reduce((sum, g) => sum + g, 0) / validGrades.length
    })

    const allAverages = rows.map(r => r.average).filter((a): a is number => a !== null)
    const classAverage = allAverages.length > 0
      ? allAverages.reduce((sum, a) => sum + a, 0) / allAverages.length
      : null

    return { rows, epAverages, classAverage }
  }, [moduleProjects])

  const exportExcel = () => {
    if (!tableData) return

    const headers = ['Élève', ...moduleProjects.map(p => p.settings.testIdentifier || '?'), 'Moyenne']
    const dataRows = tableData.rows.map(row => [
      row.name,
      ...row.grades.map(g => g !== null ? g : ''),
      row.average !== null ? row.average : '',
    ])
    // Ligne moyenne classe
    const avgRow = ['Moyenne classe', ...tableData.epAverages.map(a => a !== null ? a : ''), tableData.classAverage !== null ? tableData.classAverage : '']

    const matrix = [headers, ...dataRows, avgRow]
    const worksheet = XLSX.utils.aoa_to_sheet(matrix)

    // Largeur colonnes
    worksheet['!cols'] = [{ wch: 28 }, ...moduleProjects.map(() => ({ wch: 10 })), { wch: 10 }]

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Synthèse EP')
    const content = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
    const blob = new Blob([content], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Synthese-EP-${moduleName}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (projectsQuery.isLoading) {
    return (
      <section className="space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <div className="w-6 h-6 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Chargement...</p>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      {/* HEADER */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-linear-to-r from-indigo-900 via-indigo-800 to-indigo-900 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {onBack && (
                <button
                  onClick={onBack}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-indigo-200 hover:text-white hover:bg-white/10 rounded-lg transition-all text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Retour
                </button>
              )}
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                  <svg className="w-6 h-6 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  {moduleName}
                </h2>
                <p className="text-sm text-indigo-300 mt-1">
                  {moduleProjects.length} EP · {moduleProjects.map(p => p.settings.testIdentifier || '?').join(', ')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-indigo-200">
              {tableData && (
                <>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-white">{tableData.rows.length}</span>
                    <span>élève{tableData.rows.length > 1 ? 's' : ''}</span>
                  </div>
                  {tableData.classAverage !== null && (
                    <div className="flex items-center gap-1">
                      <span>Moy:</span>
                      <span className="font-bold text-white">{formatGrade(tableData.classAverage)}</span>
                    </div>
                  )}
                  <button
                    onClick={exportExcel}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-all active:scale-95"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Excel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* STATS RAPIDES */}
      {tableData && tableData.classAverage !== null && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {tableData.epAverages.map((avg, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-lg px-4 py-3 text-center shadow-sm">
              <div className={`text-lg font-bold tabular-nums ${gradeColor(avg)}`}>{formatGrade(avg)}</div>
              <div className="text-[11px] text-slate-500 font-medium">{moduleProjects[i].settings.testIdentifier || `EP${i + 1}`}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {moduleProjects[i].settings.testType === 'sommatif' ? 'Sommatif' : 'Formatif'}
              </div>
            </div>
          ))}
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 text-center shadow-sm">
            <div className={`text-lg font-bold tabular-nums ${gradeColor(tableData.classAverage)}`}>{formatGrade(tableData.classAverage)}</div>
            <div className="text-[11px] text-indigo-600 font-semibold">Moyenne générale</div>
            <div className="text-[10px] text-indigo-400 mt-0.5">Toutes EP confondues</div>
          </div>
        </div>
      )}

      {/* TABLE */}
      {tableData && tableData.rows.length > 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 text-white text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 text-left font-semibold min-w-48">Élève</th>
                  {moduleProjects.map((project) => (
                    <th key={project.id} className="px-4 py-3 text-center font-semibold min-w-24">
                      {project.settings.testIdentifier || '?'}
                      {project.settings.testType && (
                        <div className="text-[10px] font-normal text-slate-400 mt-0.5">
                          {project.settings.testType === 'sommatif' ? 'Somm.' : 'Form.'}
                        </div>
                      )}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center font-semibold min-w-24 bg-indigo-900">
                    Moyenne
                  </th>
                </tr>
              </thead>
              <tbody>
                {tableData.rows.map((row, rowIdx) => (
                  <tr
                    key={row.id}
                    className={`border-b border-slate-100 hover:bg-blue-50/30 transition-colors ${
                      rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                    }`}
                  >
                    <td className="px-4 py-2.5 font-medium text-slate-700">
                      {row.name}
                      <span className="text-[10px] text-slate-400 ml-2">
                        {row.completedCount}/{moduleProjects.length}
                      </span>
                    </td>
                    {row.grades.map((grade, epIdx) => (
                      <td
                        key={epIdx}
                        className={`px-4 py-2.5 text-center tabular-nums ${gradeColor(grade)} ${gradeBg(grade)}`}
                      >
                        {formatGrade(grade)}
                      </td>
                    ))}
                    <td className={`px-4 py-2.5 text-center tabular-nums font-bold ${gradeColor(row.average)} bg-indigo-50/50`}>
                      {formatGrade(row.average)}
                    </td>
                  </tr>
                ))}
                {/* Ligne moyenne de classe */}
                <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-xs uppercase">
                  <td className="px-4 py-3 text-slate-600">Moyenne classe</td>
                  {tableData.epAverages.map((avg, i) => (
                    <td key={i} className={`px-4 py-3 text-center tabular-nums ${gradeColor(avg)}`}>
                      {formatGrade(avg)}
                    </td>
                  ))}
                  <td className={`px-4 py-3 text-center tabular-nums ${gradeColor(tableData.classAverage)} bg-indigo-100/50`}>
                    {formatGrade(tableData.classAverage)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <div className="text-4xl mb-3 opacity-30">📊</div>
          <h3 className="text-lg font-semibold text-slate-700 mb-1">Aucune donnée</h3>
          <p className="text-sm text-slate-400">
            Finalisez les évaluations des différentes EP pour voir la synthèse.
          </p>
        </div>
      )}
    </section>
  )
}
