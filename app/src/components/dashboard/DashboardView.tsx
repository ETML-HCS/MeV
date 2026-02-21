import { useEffect, useState, useMemo, useCallback } from 'react'
import { calculateGridTotals } from '../../lib/calculations'
import { exportDatabase, importDatabase, downloadBackup } from '../../lib/db'
import type { AppSettings, Objective, Student, StudentGrid, Evaluation } from '../../types'

const MIN_ROWS = 20
const MAX_ROWS = 50

// Colorer les notes selon le seuil (surbase note /5)
const colorForGrade = (gradeOver5: number | null | undefined) => {
  if (gradeOver5 === null || gradeOver5 === undefined) return 'bg-white text-slate-300'
  // HAUTE FIX #6: Check for NaN to avoid false green coloring
  if (!Number.isFinite(gradeOver5)) return 'bg-white text-slate-300'
  if (gradeOver5 < 2.0) return 'bg-red-100 text-red-700'
  if (gradeOver5 < 3.5) return 'bg-orange-100 text-orange-700'
  if (gradeOver5 < 4.0) return 'bg-amber-100 text-amber-700'
  return 'bg-emerald-100 text-emerald-700'
}

interface DashboardViewProps {
   students: Student[]
   objectives: Objective[]
   grids: StudentGrid[]
   settings: AppSettings
   onUpdateSettings: (next: AppSettings) => void
   onCreateStudents: (students: { lastname: string; firstname: string }[]) => Promise<void>
   testType: 'formatif' | 'sommatif'
}

export const DashboardView = ({
   students,
   objectives,
   grids,
   settings,
   onUpdateSettings,
   onCreateStudents,
   testType,
}: DashboardViewProps) => {
   const [studentInputs, setStudentInputs] = useState<{ lastname: string; firstname: string }[]>(
      Array.from({ length: MIN_ROWS }, () => ({ lastname: '', firstname: '' })),
   )
   const [quickPaste, setQuickPaste] = useState('')
   const [isStudentInputClosed, setIsStudentInputClosed] = useState(false)
   const [showQuickImport, setShowQuickImport] = useState(false)
   const [backupStatus, setBackupStatus] = useState<'idle' | 'exporting' | 'importing' | 'success' | 'error'>('idle')
   const [backupMessage, setBackupMessage] = useState('')

   // Fonctions de sauvegarde/restauration
   const handleExportBackup = async () => {
      try {
         setBackupStatus('exporting')
         setBackupMessage('Export en cours...')
         const jsonData = await exportDatabase()
         downloadBackup(jsonData)
         setBackupStatus('success')
         setBackupMessage('Sauvegarde téléchargée avec succès')
         setTimeout(() => {
            setBackupStatus('idle')
            setBackupMessage('')
         }, 3000)
      } catch (error) {
         setBackupStatus('error')
         setBackupMessage(`Erreur lors de l'export : ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
         setTimeout(() => {
            setBackupStatus('idle')
            setBackupMessage('')
         }, 5000)
      }
   }

   const handleImportBackup = async (merge: boolean = false) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json'
      input.onchange = async (e) => {
         const file = (e.target as HTMLInputElement).files?.[0]
         if (!file) return

         try {
            setBackupStatus('importing')
            setBackupMessage('Import en cours...')
            const text = await file.text()
            await importDatabase(text, { merge })
            setBackupStatus('success')
            setBackupMessage(merge ? 'Données fusionnées avec succès' : 'Données restaurées avec succès')
            setTimeout(() => {
               setBackupStatus('idle')
               setBackupMessage('')
               // Recharger la page pour afficher les nouvelles données
               window.location.reload()
            }, 2000)
         } catch (error) {
            setBackupStatus('error')
            setBackupMessage(`Erreur lors de l'import : ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
            setTimeout(() => {
               setBackupStatus('idle')
               setBackupMessage('')
            }, 5000)
         }
      }
      input.click()
   }

   const handleRestoreBackup = () => {
      if (confirm('ATTENTION : Cette action remplacera toutes vos données actuelles par celles du fichier de sauvegarde.\n\nVoulez-vous continuer ?')) {
         handleImportBackup(false)
      }
   }

   const handleMergeBackup = () => {
      if (confirm('Cette action fusionnera les données du fichier avec vos données actuelles.\n\nContinuer ?')) {
         handleImportBackup(true)
      }
   }

   // Fonctions de gestion des élèves
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

   const clearAllStudents = () => {
      if (confirm('Êtes-vous sûr de vouloir supprimer tous les élèves ?')) {
         setStudentInputs(Array.from({ length: MIN_ROWS }, () => ({ lastname: '', firstname: '' })))
         setIsStudentInputClosed(false)
      }
   }

   const { maxPoints: gridMaxPoints } = calculateGridTotals(objectives, [])
   
   // Calculer le max effectif selon le nombre de questions à répondre
   // HAUTE FIX #11: Use calculateGridTotals with limited questions for accurate weights
   const totalQuestions = objectives.reduce((sum, o) => sum + o.indicators.length, 0)
   let effectiveMaxPoints = gridMaxPoints
   if (settings.maxQuestionsToAnswer !== null && settings.maxQuestionsToAnswer < totalQuestions) {
      // Create fake evaluations to simulate the limit and get accurate weighted max points
      const fakeEvals: Evaluation[] = []
      let count = 0
      for (const obj of objectives) {
         for (const ind of obj.indicators) {
            if (count < settings.maxQuestionsToAnswer) {
               fakeEvals.push({
                  objectiveId: obj.id,
                  indicatorId: ind.id,
                  score: null,
                  customRemark: '',
                  calculatedPoints: 0,
                  selected: true,
               })
               count++
            }
         }
      }
      const { maxPoints: limitedMaxPoints } = calculateGridTotals(objectives, fakeEvals)
      effectiveMaxPoints = limitedMaxPoints
   }
   
   // Si les questions ont des poids différents et qu'il y a une limite, le maxPoints est variable
   const hasVariableWeights = objectives.some(o => o.indicators.some(i => i.weight !== objectives[0].indicators[0].weight)) || objectives.some(o => o.weight !== objectives[0].weight)
   const isMaxPointsVariable = settings.maxQuestionsToAnswer !== null && settings.maxQuestionsToAnswer < totalQuestions && hasVariableWeights

   const minPointsFor4 = effectiveMaxPoints * settings.threshold
   const filledStudents = studentInputs.filter(s => s.lastname.trim() || s.firstname.trim()).length
   const displayedStudentInputs = isStudentInputClosed
      ? studentInputs.filter((entry) => entry.lastname.trim() || entry.firstname.trim())
      : studentInputs

   const getMetricsForInput = useCallback((lastname: string, firstname: string) => {
      const student = students.find(
         (entry) =>
            entry.lastname.trim().toLowerCase() === lastname.trim().toLowerCase() &&
            entry.firstname.trim().toLowerCase() === firstname.trim().toLowerCase(),
      )
      if (!student) return { points: '', note1: '', note5: '' }
      
      const grid = grids.find((entry) => entry.studentId === student.id)
      if (!grid) return { points: '0.00', note1: '1.0', note5: '1.0' }
      
      const note1 = grid.finalGrade
      const note5 = Math.round(note1 * 2) / 2
      return {
         points: grid.totalPoints.toFixed(2),
         note1: note1.toFixed(1),
         note5: note5.toFixed(1),
      }
   }, [students, grids])

   useEffect(() => {
      // Initialiser depuis la DB seulement s'il n'y a pas déjà de saisie en cours
      if (studentInputs.length === MIN_ROWS && studentInputs.every(s => !s.lastname && !s.firstname)) {
         const dbStudents = students.map(s => ({ lastname: s.lastname, firstname: s.firstname }))
         if (dbStudents.length > 0) {
            // Si des élèves existent en DB, afficher seulement ceux-là (sans lignes vides)
            setStudentInputs(dbStudents)
            setIsStudentInputClosed(true) // Marquer comme fermé car ce sont des élèves existants
         }
      }
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

      // Créer au minimum MIN_ROWS, mais plus si des données sont collées
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
      
      // Filtrer uniquement les nouveaux élèves (ceux qui n'existent pas encore en DB)
      const newStudents = cleaned.filter(input => {
         return !students.some(existing => 
            existing.lastname.trim().toLowerCase() === input.lastname.trim().toLowerCase() &&
            existing.firstname.trim().toLowerCase() === input.firstname.trim().toLowerCase()
         )
      })
      
      // Créer seulement les nouveaux élèves dans la base de données
      if (newStudents.length > 0) {
         await onCreateStudents(newStudents)
      }
      
      setStudentInputs(cleaned)
      setIsStudentInputClosed(true)
   }

   const classAverages = useMemo(() => {
      let totalNote1 = 0;
      let totalNote5 = 0;
      let count = 0;

      displayedStudentInputs.forEach(entry => {
         const student = students.find(
            (s) =>
               s.lastname.trim().toLowerCase() === entry.lastname.trim().toLowerCase() &&
               s.firstname.trim().toLowerCase() === entry.firstname.trim().toLowerCase(),
         );
         if (student) {
            const grid = grids.find((g) => g.studentId === student.id);
            if (grid) {
               const note1 = grid.finalGrade;
               const note5 = Math.round(note1 * 2) / 2;
               totalNote1 += note1;
               totalNote5 += note5;
               count++;
            }
         }
      });

      if (count === 0) return { note1: null, note5: null };
      return {
         note1: (totalNote1 / count).toFixed(1),
         note5: (totalNote5 / count).toFixed(1)
      };
   }, [displayedStudentInputs, students, grids]);

   return (
      <section className="space-y-6">

         {/* SAUVEGARDE / RESTAURATION */}
         <div className="bg-gradient-to-br from-white to-slate-50/30 rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-500 flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                     <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                     </svg>
                  </div>
                  <h3 className="text-sm font-bold text-white">Sauvegarde & Restauration</h3>
               </div>
               {backupStatus !== 'idle' && (
                  <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                     backupStatus === 'success' ? 'bg-green-500/20 text-green-100' :
                     backupStatus === 'error' ? 'bg-red-500/20 text-red-100' :
                     'bg-white/20 text-blue-100'
                  }`}>
                     {backupMessage}
                  </span>
               )}
            </div>
            <div className="px-6 py-5">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="relative group">
                     <button
                        onClick={handleExportBackup}
                        disabled={backupStatus !== 'idle'}
                        className="w-full px-4 py-2 bg-linear-to-r from-blue-600 to-blue-500 text-white text-sm font-semibold rounded-lg hover:from-blue-700 hover:to-blue-600 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                     >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span>Télécharger</span>
                     </button>
                     <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                        <div className="bg-slate-900 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-lg">
                           Crée une copie de sécurité de toutes vos données
                           <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                        </div>
                     </div>
                  </div>
                  <div className="relative group">
                     <button
                        onClick={handleRestoreBackup}
                        disabled={backupStatus !== 'idle'}
                        className="w-full px-4 py-2 bg-linear-to-r from-orange-600 to-orange-500 text-white text-sm font-semibold rounded-lg hover:from-orange-700 hover:to-orange-600 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                     >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        <span>Restaurer</span>
                     </button>
                     <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                        <div className="bg-slate-900 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-lg">
                           Remplace toutes les données actuelles
                           <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                        </div>
                     </div>
                  </div>
                  <div className="relative group">
                     <button
                        onClick={handleMergeBackup}
                        disabled={backupStatus !== 'idle'}
                        className="w-full px-4 py-2 bg-linear-to-r from-teal-600 to-teal-500 text-white text-sm font-semibold rounded-lg hover:from-teal-700 hover:to-teal-600 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                     >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        <span>Fusionner</span>
                     </button>
                     <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                        <div className="bg-slate-900 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-lg">
                           Ajoute les nouveaux projets sans supprimer
                           <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>

         {/* CONFIGURATION DU TEST */}
         <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-linear-to-r from-slate-900 to-slate-800 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
               <h3 className="text-xs font-semibold tracking-wider text-white uppercase">Configuration du test</h3>
               <div className="inline-flex w-fit items-center gap-2 rounded-md border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] text-slate-200">
                  <span>Pts 4.0 :</span>
                  <span className="text-sm font-bold text-white">
                     {isMaxPointsVariable ? 'Variable' : minPointsFor4.toFixed(0)}
                  </span>
                  <span>
                     / {isMaxPointsVariable ? 'Variable' : effectiveMaxPoints.toFixed(0)}
                     {settings.maxQuestionsToAnswer !== null && effectiveMaxPoints !== gridMaxPoints && !isMaxPointsVariable && (
                        <span className="ml-1 opacity-60">({gridMaxPoints.toFixed(0)})</span>
                     )}
                  </span>
               </div>
            </div>
            <div className="px-5 py-4">
               {/* Ligne 1 — Champs principaux */}
               <div className="grid grid-cols-1 gap-3 items-end md:grid-cols-2 xl:grid-cols-[1fr_0.7fr_auto_0.7fr_auto]">
                  <div>
                     <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Module</label>
                     <input
                        className="w-full border border-slate-200 rounded-md px-2.5 py-1.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none transition-all bg-slate-50/50 hover:border-slate-300"
                        value={settings.moduleName}
                        onChange={(e) => onUpdateSettings({ ...settings, moduleName: e.target.value })}
                        placeholder="Nom du module"
                     />
                  </div>
                  <div>
                     <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">ID test</label>
                     <input
                        className="w-full border border-slate-200 rounded-md px-2.5 py-1.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none transition-all bg-slate-50/50 hover:border-slate-300"
                        value={settings.testIdentifier}
                        onChange={(e) => onUpdateSettings({ ...settings, testIdentifier: e.target.value })}
                        placeholder="ex: 164-t3"
                     />
                  </div>
                  <div>
                     <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Date</label>
                     <input
                        type="date"
                        className="w-full border border-slate-200 rounded-md px-2.5 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none transition-all bg-slate-50/50 hover:border-slate-300"
                        value={settings.testDate}
                        onChange={(e) => onUpdateSettings({ ...settings, testDate: e.target.value })}
                     />
                  </div>
                  <div>
                     <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Type</label>
                     <div className="inline-flex rounded-md overflow-hidden border border-slate-200 bg-white">
                        {(['formatif', 'sommatif'] as const).map((t) => (
                           <button
                              key={t}
                              onClick={() => onUpdateSettings({ ...settings, testType: t })}
                              className={`px-3 py-1.5 text-xs font-semibold capitalize transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-300 ${
                                 settings.testType === t
                                    ? 'bg-slate-800 text-white shadow-sm'
                                    : 'bg-white text-slate-500 hover:bg-slate-50'
                              }`}
                           >
                              {t}
                           </button>
                        ))}
                     </div>
                  </div>
                  <div>
                     <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Correcteur</label>
                     <input
                        className="w-full border border-slate-200 rounded-md px-2.5 py-1.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none transition-all bg-slate-50/50 hover:border-slate-300"
                        value={settings.correctedBy}
                        onChange={(e) => onUpdateSettings({ ...settings, correctedBy: e.target.value })}
                        placeholder="Initiales"
                     />
                  </div>
                  <div>
                     <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">École (PDF)</label>
                     <input
                        className="w-full border border-slate-200 rounded-md px-2.5 py-1.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none transition-all bg-slate-50/50 hover:border-slate-300"
                        value={settings.schoolName}
                        onChange={(e) => onUpdateSettings({ ...settings, schoolName: e.target.value })}
                        placeholder="ex: ETML / CFPV"
                        title="Peut contenir du HTML simple (ex: <strong>ETML</strong> / CFPV)"
                     />
                     <p className="text-[8px] text-slate-400 mt-1">Peut contenir du HTML simple (&lt;strong&gt;, &lt;em&gt;, &lt;sub&gt;, &lt;sup&gt;)</p>
                  </div>
               </div>

               {/* Ligne 2 — Description + Paramètres numériques */}
               <div className="grid grid-cols-1 gap-3 items-end mt-3 md:grid-cols-[1fr_auto_auto_auto]">
                  <div>
                     <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Description</label>
                     <textarea
                        className="w-full border border-slate-200 rounded-md px-2.5 py-1.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none transition-all bg-slate-50/50 hover:border-slate-300 min-h-24 max-h-40 overflow-y-auto resize-none"
                        value={settings.moduleDescription}
                        onChange={(e) => onUpdateSettings({ ...settings, moduleDescription: e.target.value })}
                        placeholder="Description du test..."
                     />
                  </div>
                  <div>
                     <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Questions
                     </label>
                     <input
                        type="number"
                        min={1}
                        placeholder="Toutes"
                        className="w-20 border border-slate-200 rounded-md px-2 py-1.5 text-sm text-center font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none bg-slate-50/50 hover:border-slate-300"
                        value={settings.maxQuestionsToAnswer ?? ''}
                        onChange={(e) => {
                           const val = e.target.value.trim()
                           onUpdateSettings({ ...settings, maxQuestionsToAnswer: val === '' ? null : Math.max(1, Number(val)) })
                        }}
                     />
                  </div>
                  <div>
                     <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Facteur erreur
                     </label>
                     <p className="text-[9px] text-slate-400 mb-1.5">(bonus/malus note)</p>
                     <div className="flex items-center gap-1">
                        <input
                           type="number"
                           step="0.1"
                           min={-1}
                           max={1}
                           className="w-20 border border-slate-200 rounded-md px-2 py-1.5 text-sm text-center font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none bg-slate-50/50 hover:border-slate-300"
                           value={settings.correctionError}
                           onChange={(e) => onUpdateSettings({ ...settings, correctionError: Math.max(-1, Math.min(1, Number(e.target.value))) })}
                        />
                        <span className="text-xs text-slate-400 font-medium">pts</span>
                     </div>
                  </div>
                  <div>
                     <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Seuil 4.0</label>
                     <div className="flex items-center gap-1">
                        <input
                           type="number"
                           min={0}
                           max={100}
                           className="w-16 border border-slate-200 rounded-md px-2 py-1.5 text-sm text-center font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none bg-slate-50/50 hover:border-slate-300"
                           value={Math.round(settings.threshold * 100)}
                           onChange={(e) => onUpdateSettings({ ...settings, threshold: Number(e.target.value) / 100 })}
                        />
                        <span className="text-xs text-slate-400 font-medium">%</span>
                     </div>
                  </div>
               </div>
            </div>
         </div>

         {/* SAISIE RAPIDE ÉLÈVES */}
         <div className="grid grid-cols-1 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
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
                        Fermer la saisie élèves
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
                                    <span className="text-xs font-semibold px-2 py-1 rounded bg-blue-100 text-blue-700">{metrics.points || '—'}</span>
                                 </td>
                                 <td className="py-1.5 px-2 text-center">
                                    <span className={`text-xs font-semibold px-2 py-1 rounded ${colorForGrade(parseFloat(metrics.note1))}`}>
                                       {metrics.note1 || '—'}
                                    </span>
                                 </td>
                                 <td className="py-1.5 px-2 text-center">
                                    <span className={`text-xs font-semibold px-2 py-1 rounded ${colorForGrade(parseFloat(metrics.note5))}`}>
                                       {metrics.note5 || '—'}
                                    </span>
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
      </section>
   )
}