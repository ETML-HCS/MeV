import { useEffect, useState, useMemo, useCallback } from 'react'
import { useConfirm } from '../../hooks/useConfirm'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import type { Student, StudentGrid } from '../../types'

const MIN_ROWS = 20
const MAX_ROWS = 50

// Colorer les notes selon le seuil (sur base note /5)
const colorForGrade = (gradeOver5: number | null | undefined) => {
   if (gradeOver5 === null || gradeOver5 === undefined) return 'bg-white text-slate-300'
   if (!Number.isFinite(gradeOver5)) return 'bg-white text-slate-300'
   if (gradeOver5 < 2.0) return 'bg-red-100 text-red-700'
   if (gradeOver5 < 3.5) return 'bg-orange-100 text-orange-700'
   if (gradeOver5 < 4.0) return 'bg-amber-100 text-amber-700'
   return 'bg-emerald-100 text-emerald-700'
}

interface StudentInputSectionProps {
   students: Student[]
   grids: StudentGrid[]
   testType: 'formatif' | 'sommatif'
   onCreateStudents: (students: { lastname: string; firstname: string }[]) => Promise<void>
}

export const StudentInputSection = ({
   students,
   grids,
   testType,
   onCreateStudents,
}: StudentInputSectionProps) => {
   const [studentInputs, setStudentInputs] = useState<{ lastname: string; firstname: string }[]>(
      Array.from({ length: MIN_ROWS }, () => ({ lastname: '', firstname: '' })),
   )
   const [quickPaste, setQuickPaste] = useState('')
   const [isStudentInputClosed, setIsStudentInputClosed] = useState(false)
   const [showQuickImport, setShowQuickImport] = useState(false)
   const [confirm, confirmDialogProps] = useConfirm()

   const filledStudents = studentInputs.filter(s => s.lastname.trim() || s.firstname.trim()).length
   const displayedStudentInputs = isStudentInputClosed
      ? studentInputs.filter((entry) => entry.lastname.trim() || entry.firstname.trim())
      : studentInputs

   const addStudentRow = () => {
      if (studentInputs.length < MAX_ROWS) {
         setStudentInputs([...studentInputs, { lastname: '', firstname: '' }])
      }
   }

   const removeStudentRow = (index: number) => {
      if (studentInputs.length > MIN_ROWS) {
         setStudentInputs(studentInputs.filter((_, i) => i !== index))
      }
   }

   const clearAllStudents = async () => {
      const ok = await confirm({
         title: 'Vider la liste',
         message: 'Êtes-vous sûr de vouloir supprimer tous les élèves ?',
         confirmLabel: 'Vider tous',
         variant: 'danger',
      })
      if (ok) {
         setStudentInputs(Array.from({ length: MIN_ROWS }, () => ({ lastname: '', firstname: '' })))
         setIsStudentInputClosed(false)
      }
   }

   const getMetricsForInput = useCallback((lastname: string, firstname: string) => {
      const student = students.find(
         (entry) =>
            entry.lastname.trim().toLowerCase() === lastname.trim().toLowerCase() &&
            entry.firstname.trim().toLowerCase() === firstname.trim().toLowerCase(),
      )
      if (!student) return { points: '', note1: '', note5: '', isAbsent: false, isCompleted: false }

      const grid = grids.find((entry) => entry.studentId === student.id)
      if (!grid) return { points: '0.00', note1: '1.0', note5: '1.0', isAbsent: false, isCompleted: false }

      const isAbsent = grid.testDateOverride !== undefined
      const isCompleted = !!grid.completedAt

      const note1 = grid.finalGrade
      const note5 = Math.round(note1 * 2) / 2
      return {
         points: grid.totalPoints.toFixed(2),
         note1: note1.toFixed(1),
         note5: note5.toFixed(1),
         isAbsent,
         isCompleted,
      }
   }, [students, grids])

   useEffect(() => {
      const dbStudents = students.map(s => ({ lastname: s.lastname, firstname: s.firstname }))
      const isPristine = studentInputs.length === MIN_ROWS && studentInputs.every(s => !s.lastname && !s.firstname)

      if (dbStudents.length > 0) {
         // Sync depuis la DB quand les inputs sont vierges OU déjà fermés (changement de projet)
         if (isPristine || isStudentInputClosed) {
            setStudentInputs(dbStudents)
            setIsStudentInputClosed(true)
         }
      } else if (isStudentInputClosed) {
         // DB vide mais saisie fermée (ex: changement de projet) → réinitialiser
         setStudentInputs(Array.from({ length: MIN_ROWS }, () => ({ lastname: '', firstname: '' })))
         setIsStudentInputClosed(false)
      }
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [students])

   const applyQuickPaste = () => {
      const parsed = quickPaste
         .split(/\r?\n/)
         .map((line) => line.trim())
         .filter(Boolean)
         .map((line) => line.split(/\t|;|,/).map((part) => part.trim()))
         .filter((parts) => parts.length >= 2)
         .map((parts) => ({ lastname: parts[0], firstname: parts[1] }))
         .slice(0, MAX_ROWS)

      const rowsNeeded = Math.max(MIN_ROWS, parsed.length)

      setStudentInputs(
         Array.from({ length: rowsNeeded }, (_, index) => parsed[index] ?? { lastname: '', firstname: '' }),
      )
      setQuickPaste('')
      setIsStudentInputClosed(false)
      setShowQuickImport(false)
   }

   const closeStudentInput = async () => {
      const cleaned = studentInputs.filter((entry) => entry.lastname.trim() || entry.firstname.trim())
      if (cleaned.length === 0) return

      const newStudents = cleaned.filter(input => {
         return !students.some(existing =>
            existing.lastname.trim().toLowerCase() === input.lastname.trim().toLowerCase() &&
            existing.firstname.trim().toLowerCase() === input.firstname.trim().toLowerCase(),
         )
      })

      if (newStudents.length > 0) {
         await onCreateStudents(newStudents)
      }

      setStudentInputs(cleaned)
      setIsStudentInputClosed(true)
   }

   const classAverages = useMemo(() => {
      let totalNote1 = 0
      let totalNote5 = 0
      let count = 0

      displayedStudentInputs.forEach(entry => {
         const student = students.find(
            (s) =>
               s.lastname.trim().toLowerCase() === entry.lastname.trim().toLowerCase() &&
               s.firstname.trim().toLowerCase() === entry.firstname.trim().toLowerCase(),
         )
         if (student) {
            const grid = grids.find((g) => g.studentId === student.id)
            if (grid) {
               const isAbsent = grid.testDateOverride !== undefined
               const isCompleted = !!grid.completedAt

               if (!isAbsent || isCompleted) {
                  const note1 = grid.finalGrade
                  const note5 = Math.round(note1 * 2) / 2
                  totalNote1 += note1
                  totalNote5 += note5
                  count++
               }
            }
         }
      })

      if (count === 0) return { note1: null, note5: null }
      return {
         note1: (totalNote1 / count).toFixed(1),
         note5: (totalNote5 / count).toFixed(1),
      }
   }, [displayedStudentInputs, students, grids])

   return (
      <>
         <div className="grid grid-cols-1 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
               <div className="px-5 py-3.5 border-b border-slate-200 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-slate-50">
                  <div>
                     <h3 className="text-sm font-bold text-slate-800">Saisie des élèves</h3>
                     <p className="text-[11px] text-slate-500 mt-0.5">{filledStudents} élève{filledStudents !== 1 ? 's' : ''} saisi{filledStudents !== 1 ? 's' : ''} sur {studentInputs.length}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                     <button
                        onClick={() => setShowQuickImport((prev) => !prev)}
                        className={`px-3 py-2 bg-white border text-xs font-semibold rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 ${
                           testType === 'formatif'
                              ? 'border-slate-300 text-slate-700 hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 focus-visible:ring-emerald-200'
                              : 'border-slate-300 text-slate-700 hover:border-orange-400 hover:text-orange-700 hover:bg-orange-50 focus-visible:ring-orange-200'
                        }`}
                     >
                        {showQuickImport ? 'Masquer import rapide' : 'Afficher import rapide'}
                     </button>
                     <button
                        onClick={addStudentRow}
                        disabled={isStudentInputClosed || studentInputs.length >= MAX_ROWS}
                        className={`px-3 py-2 bg-white border text-xs font-semibold rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 disabled:opacity-40 disabled:cursor-not-allowed ${
                           testType === 'formatif'
                              ? 'border-slate-300 text-slate-700 hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 focus-visible:ring-emerald-200'
                              : 'border-slate-300 text-slate-700 hover:border-orange-400 hover:text-orange-700 hover:bg-orange-50 focus-visible:ring-orange-200'
                        }`}
                        title="Ajouter une nouvelle ligne d'élève"
                     >
                        + Ajouter
                     </button>
                     <button
                        onClick={clearAllStudents}
                        disabled={isStudentInputClosed || filledStudents === 0}
                        className="px-3 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:border-rose-400 hover:text-rose-700 hover:bg-rose-50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200 disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Vider tous les élèves"
                     >
                        Vider tous
                     </button>
                     <button
                        onClick={closeStudentInput}
                        disabled={filledStudents === 0 || isStudentInputClosed}
                        className={`px-4 py-2 text-white text-xs font-semibold rounded-lg active:scale-95 transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 disabled:opacity-40 disabled:cursor-not-allowed ${
                           testType === 'formatif'
                              ? 'bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-200'
                              : 'bg-orange-600 hover:bg-orange-700 focus-visible:ring-orange-200'
                        }`}
                     >
                        Valider la liste des élèves
                     </button>
                  </div>
               </div>

               {showQuickImport && (
                  <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/60">
                     <div className="max-w-xl space-y-3">
                        <div>
                           <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Import rapide</h4>
                           <p className="text-[11px] text-slate-500 mt-1">Coller une liste Nom/Prénom puis importer.</p>
                        </div>
                        <textarea
                           value={quickPaste}
                           onChange={(e) => setQuickPaste(e.target.value)}
                           rows={4}
                           className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none resize-none placeholder:text-slate-400 bg-white"
                           placeholder={"Coller une liste :\nDupont\tJean\nMartin\tPierre"}
                        />
                        <div className="flex justify-end">
                           <button
                              onClick={applyQuickPaste}
                              disabled={!quickPaste.trim()}
                              className="px-4 py-2 bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-slate-900 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:opacity-40 disabled:cursor-not-allowed"
                           >
                              Importer la liste
                           </button>
                        </div>
                     </div>
                  </div>
               )}

               <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                     <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                           <th className="w-10 py-2.5 px-3 text-center text-[10px] font-semibold text-slate-400 uppercase">#</th>
                           <th className="py-2.5 px-3 text-left text-[10px] font-semibold text-slate-400 uppercase">Nom</th>
                           <th className="py-2.5 px-3 text-left text-[10px] font-semibold text-slate-400 uppercase">Prénom</th>
                           <th className="w-20 py-2.5 px-2 text-center text-[10px] font-semibold text-slate-400 uppercase">Pts</th>
                           <th className="w-24 py-2.5 px-2 text-center text-[10px] font-semibold text-slate-400 uppercase">
                              {classAverages.note1 ? `${classAverages.note1} | (/10)` : '/10'}
                           </th>
                           <th className="w-24 py-2.5 px-2 text-center text-[10px] font-semibold text-slate-400 uppercase">
                              {classAverages.note5 ? `${classAverages.note5} | (/5)` : '/5'}
                           </th>
                           <th className="w-12 py-2.5 px-1 text-center text-[10px] font-semibold text-slate-400 uppercase">Actions</th>
                        </tr>
                     </thead>
                     <tbody>
                        {displayedStudentInputs.map((entry, index) => {
                           const metrics = getMetricsForInput(entry.lastname, entry.firstname)
                           const hasData = entry.lastname.trim() || entry.firstname.trim()
                           return (
                              <tr
                                 key={index}
                                 className={`border-b border-slate-100/90 transition-colors ${
                                    hasData ? 'bg-blue-50/50 hover:bg-blue-50/70' : 'hover:bg-slate-50/60'
                                 }`}
                              >
                                 <td className="py-1.5 px-3 text-center">
                                    <span className={`text-xs font-medium ${hasData ? 'text-blue-500' : 'text-slate-300'}`}>
                                       {index + 1}
                                    </span>
                                 </td>
                                 <td className="py-1.5 px-3">
                                    <input
                                       value={entry.lastname}
                                       onChange={(e) => setStudentInputs(prev => prev.map((item, i) => i === index ? { ...item, lastname: e.target.value } : item))}
                                       disabled={isStudentInputClosed}
                                       className="w-full border-0 bg-transparent p-0 text-sm font-medium text-slate-900 focus:ring-0 placeholder:text-slate-300 outline-none disabled:text-slate-400"
                                       placeholder="Nom"
                                    />
                                 </td>
                                 <td className="py-1.5 px-3">
                                    <input
                                       value={entry.firstname}
                                       onChange={(e) => setStudentInputs(prev => prev.map((item, i) => i === index ? { ...item, firstname: e.target.value } : item))}
                                       disabled={isStudentInputClosed}
                                       className="w-full border-0 bg-transparent p-0 text-sm text-slate-700 focus:ring-0 placeholder:text-slate-300 outline-none disabled:text-slate-400"
                                       placeholder="Prénom"
                                    />
                                 </td>
                                 <td className="py-1.5 px-2 text-center">
                                    {metrics.isAbsent && !metrics.isCompleted ? (
                                       <span className="text-xs font-bold px-2 py-1 rounded bg-red-100 text-red-700">abs</span>
                                    ) : metrics.isAbsent && metrics.isCompleted ? (
                                       <span className="text-xs font-bold px-2 py-1 rounded bg-orange-100 text-orange-700">{metrics.points || '—'}</span>
                                    ) : (
                                       <span className="text-xs font-semibold px-2 py-1 rounded bg-blue-100 text-blue-700">{metrics.points || '—'}</span>
                                    )}
                                 </td>
                                 <td className="py-1.5 px-2 text-center">
                                    {metrics.isAbsent && !metrics.isCompleted ? (
                                       <span className="text-xs font-bold px-2 py-1 rounded bg-red-100 text-red-700">—</span>
                                    ) : metrics.isAbsent && metrics.isCompleted ? (
                                       <span className="text-xs font-bold px-2 py-1 rounded bg-orange-100 text-orange-700">{metrics.note1 || '—'}</span>
                                    ) : (
                                       <span className={`text-xs font-semibold px-2 py-1 rounded ${colorForGrade(parseFloat(metrics.note1))}`}>
                                          {metrics.note1 || '—'}
                                       </span>
                                    )}
                                 </td>
                                 <td className="py-1.5 px-2 text-center">
                                    {metrics.isAbsent && !metrics.isCompleted ? (
                                       <span className="text-xs font-bold px-2 py-1 rounded bg-red-100 text-red-700">—</span>
                                    ) : metrics.isAbsent && metrics.isCompleted ? (
                                       <span className="text-xs font-bold px-2 py-1 rounded bg-orange-100 text-orange-700">{metrics.note5 || '—'}</span>
                                    ) : (
                                       <span className={`text-xs font-semibold px-2 py-1 rounded ${colorForGrade(parseFloat(metrics.note5))}`}>
                                          {metrics.note5 || '—'}
                                       </span>
                                    )}
                                 </td>
                                 <td className="py-1.5 px-1 text-center">
                                    <button
                                       onClick={() => removeStudentRow(index)}
                                       disabled={isStudentInputClosed || studentInputs.length <= MIN_ROWS}
                                       className="p-1 text-slate-400 hover:text-rose-500 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                                       title="Supprimer cette ligne"
                                    >
                                       ✕
                                    </button>
                                 </td>
                              </tr>
                           )
                        })}
                     </tbody>
                  </table>
               </div>
            </div>
         </div>
         <ConfirmDialog {...confirmDialogProps} />
      </>
   )
}
