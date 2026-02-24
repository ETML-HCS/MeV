import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getProjects } from '../../lib/db'
import { parseProjectName } from '../../utils/helpers'
import type { EvaluationProject, Student, StudentGrid } from '../../types'

interface LabGroupGradesViewProps {
  onBack?: () => void
}

interface ModuleGrade {
  projectId: string
  moduleLabel: string
  testIdentifier: string
  grade: number | null
  weight: number
  prefix: 'I' | 'C' | null
}

interface StudentGradesRow {
  id: string
  name: string
  modules: ModuleGrade[]
  average: number | null
  completedCount: number
  totalCount: number
}

interface GroupSection {
  name: string
  projects: EvaluationProject[]
  students: StudentGradesRow[]
}

const formatGrade = (value: number | null) => {
  if (value === null || Number.isNaN(value)) return '-'
  return value.toFixed(2)
}

const getGridByStudentId = (grids: StudentGrid[]) => {
  const map = new Map<string, StudentGrid>()
  grids.forEach((grid) => map.set(grid.studentId, grid))
  return map
}

const getModuleLabel = (project: EvaluationProject) => {
  const parsed = parseProjectName(project.name)
  if (parsed.identificationModule) return parsed.identificationModule
  if (project.modulePrefix && project.moduleNumber) return `${project.modulePrefix}${project.moduleNumber}`
  return project.moduleNumber ?? project.name
}

const getWeight = (project: EvaluationProject) => {
  if (project.weightPercentage !== null && project.weightPercentage !== undefined) return project.weightPercentage
  if (project.modulePrefix === 'I') return 0.8
  if (project.modulePrefix === 'C') return 0.2
  return 1
}

export const LabGroupGradesView = ({ onBack }: LabGroupGradesViewProps) => {
  const [expandedStudentKey, setExpandedStudentKey] = useState<string | null>(null)

  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: getProjects,
  })

  const groups = useMemo<GroupSection[]>(() => {
    const projects = projectsQuery.data ?? []
    const groupMap = new Map<string, EvaluationProject[]>()

    projects.forEach((project) => {
      const parsed = parseProjectName(project.name)
      const groupName = parsed.groupeLabo?.trim() || project.name
      if (!groupMap.has(groupName)) groupMap.set(groupName, [])
      groupMap.get(groupName)!.push(project)
    })

    return Array.from(groupMap.entries()).map(([name, groupProjects]) => {
      const studentMap = new Map<string, { student: Student; modules: ModuleGrade[] }>()

      groupProjects.forEach((project) => {
        const gridsByStudent = getGridByStudentId(project.grids)
        project.students.forEach((student) => {
          if (!studentMap.has(student.id)) {
            studentMap.set(student.id, { student, modules: [] })
          }

          const grid = gridsByStudent.get(student.id)
          const isCompleted = Boolean(grid?.completedAt)
          if (!isCompleted) return

          studentMap.get(student.id)!.modules.push({
            projectId: project.id,
            moduleLabel: getModuleLabel(project),
            testIdentifier: project.settings.testIdentifier || 'EP?',
            grade: grid?.finalGrade ?? null,
            weight: getWeight(project),
            prefix: project.modulePrefix,
          })
        })
      })

      const students = Array.from(studentMap.values())
        .map(({ student, modules }) => {
          const completedCount = modules.length
          const totalCount = groupProjects.length
          const weightedTotal = modules.reduce((sum, entry) => sum + (entry.grade ?? 0) * entry.weight, 0)
          const weightSum = modules.reduce((sum, entry) => sum + entry.weight, 0)
          const average = weightSum > 0 ? weightedTotal / weightSum : null

          return {
            id: student.id,
            name: `${student.lastname} ${student.firstname}`.trim(),
            modules: modules.sort((a, b) => a.moduleLabel.localeCompare(b.moduleLabel)),
            average,
            completedCount,
            totalCount,
          }
        })
        .filter((row) => row.modules.length > 0)
        .sort((a, b) => a.name.localeCompare(b.name))

      return {
        name,
        projects: groupProjects,
        students,
      }
    }).sort((a, b) => a.name.localeCompare(b.name))
  }, [projectsQuery.data])

  const totalStudents = groups.reduce((sum, group) => sum + group.students.length, 0)
  const totalProjects = groups.reduce((sum, group) => sum + group.projects.length, 0)

  return (
    <section className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-linear-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {onBack && (
                <button
                  onClick={onBack}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-all text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Retour
                </button>
              )}
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                  <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Notes par groupes labo
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  Moyennes ponderees I/C basees sur les evaluations finalisees
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-300">
              <div className="flex items-center gap-1">
                <span className="font-bold text-white">{groups.length}</span>
                <span>groupes</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-bold text-white">{totalStudents}</span>
                <span>eleves</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-bold text-white">{totalProjects}</span>
                <span>modules</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {groups.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <div className="w-16 h-16 mx-auto mb-4 bg-amber-50 rounded-2xl flex items-center justify-center">
            <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-2">Aucune evaluation finalisee</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Finalisez des grilles d'evaluation pour afficher les moyennes par groupe.
          </p>
        </div>
      )}

      <div className="space-y-5">
        {groups.map((group) => (
          <div key={group.name} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">{group.name}</h3>
                <p className="text-xs text-slate-500 mt-1">
                  {group.projects.length} module{group.projects.length > 1 ? 's' : ''} · {group.students.length} eleve{group.students.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {group.students.map((student) => {
                const studentKey = `${group.name}:${student.id}`
                const isExpanded = expandedStudentKey === studentKey

                return (
                  <div key={student.id} className="px-5 py-3">
                    <button
                      className="w-full flex items-center justify-between text-left"
                      onClick={() => setExpandedStudentKey(isExpanded ? null : studentKey)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center">
                          {student.name.split(' ').map((part) => part[0]).slice(0, 2).join('') || '--'}
                        </span>
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{student.name}</div>
                          <div className="text-[11px] text-slate-400">
                            {student.completedCount}/{student.totalCount} modules finalises
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-emerald-600">{formatGrade(student.average)}</span>
                        <svg className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="mt-3 bg-slate-50 rounded-lg p-3">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {student.modules.map((entry) => (
                            <div key={`${student.id}-${entry.projectId}`} className="bg-white rounded-md border border-slate-200 p-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-xs font-bold text-slate-800">{entry.moduleLabel}</div>
                                  <div className="text-[10px] text-slate-400">{entry.testIdentifier}</div>
                                </div>
                                <span className="text-sm font-bold text-slate-700">{formatGrade(entry.grade)}</span>
                              </div>
                              <div className="mt-2 text-[10px] text-slate-500 flex items-center gap-2">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                  entry.prefix === 'I'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : entry.prefix === 'C'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {entry.prefix ?? 'N/A'}
                                </span>
                                <span>poids {entry.weight.toFixed(2)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {group.students.length === 0 && (
                <div className="px-5 py-6 text-sm text-slate-400">
                  Aucun eleve avec evaluation finalisee dans ce groupe.
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
