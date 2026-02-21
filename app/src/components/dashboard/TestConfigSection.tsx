import { useMemo } from 'react'
import { calculateGridTotals } from '../../lib/calculations'
import { defaultModuleTemplates } from '../../data/squelette_dep'
import { useConfirm } from '../../hooks/useConfirm'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import type { AppSettings, Objective, Evaluation } from '../../types'

interface TestConfigSectionProps {
   settings: AppSettings
   objectives: Objective[]
   onUpdateSettings: (next: AppSettings) => void
   onApplyTemplate: (objectives: Objective[]) => Promise<void>
}

export const TestConfigSection = ({
   settings,
   objectives,
   onUpdateSettings,
   onApplyTemplate,
}: TestConfigSectionProps) => {
   const [confirm, confirmDialogProps] = useConfirm()

   const { maxPoints: gridMaxPoints } = calculateGridTotals(objectives, [])

   // Calculer le max effectif selon le nombre de questions à répondre
   const totalQuestions = objectives.reduce((sum, o) => sum + o.indicators.length, 0)
   let effectiveMaxPoints = gridMaxPoints
   if (settings.maxQuestionsToAnswer !== null && settings.maxQuestionsToAnswer < totalQuestions) {
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

   const hasVariableWeights = objectives.some(o => o.indicators.some(i => i.weight !== objectives[0]?.indicators[0]?.weight)) || objectives.some(o => o.weight !== objectives[0]?.weight)
   const isMaxPointsVariable = settings.maxQuestionsToAnswer !== null && settings.maxQuestionsToAnswer < totalQuestions && hasVariableWeights

   const minPointsFor4 = effectiveMaxPoints * settings.threshold

   // Détection du module pour proposer un squelette
   const moduleMatch = settings.moduleName.match(/(\d{3})/) || settings.testIdentifier.match(/(\d{3})/)
   const moduleNumber = moduleMatch ? moduleMatch[1] : null

   const availableTemplates = useMemo(() => {
      if (!moduleNumber) return []
      return defaultModuleTemplates.filter(t => t.moduleNumber === moduleNumber)
   }, [moduleNumber])

   const handleApplyTemplate = async (templateId: string) => {
      const template = defaultModuleTemplates.find(t => t.id === templateId)
      if (!template) return

      if (objectives.length > 0) {
         const ok = await confirm({
            title: 'Remplacer les objectifs',
            message: `L'application de ce squelette va remplacer les ${objectives.length} objectifs actuels. Voulez-vous continuer ?`,
            confirmLabel: 'Remplacer',
            variant: 'warning',
         })
         if (!ok) return
      }

      const newObjectives = template.objectives.map(obj => ({
         ...obj,
         id: crypto.randomUUID(),
         indicators: [],
      }))

      await onApplyTemplate(newObjectives)

      // Mettre à jour les paramètres si vides
      const newSettings = { ...settings }
      let settingsChanged = false

      if (!settings.moduleName.trim() && template.name) {
         newSettings.moduleName = template.name
         settingsChanged = true
      }
      if (!settings.moduleDescription.trim() && template.description) {
         newSettings.moduleDescription = template.description
         settingsChanged = true
      }
      if (!settings.testIdentifier.trim() && template.testIdentifier) {
         newSettings.testIdentifier = template.testIdentifier
         settingsChanged = true
      }

      if (settingsChanged) {
         onUpdateSettings(newSettings)
      }
   }

   return (
      <>
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

               {/* Squelettes disponibles */}
               {availableTemplates.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                     <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Squelettes disponibles pour le module {moduleNumber}
                     </label>
                     <div className="flex flex-wrap gap-2">
                        {availableTemplates.map(template => (
                           <button
                              key={template.id}
                              onClick={() => handleApplyTemplate(template.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 border border-blue-200 rounded-md text-xs font-medium transition-colors"
                              title={template.name}
                           >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                              </svg>
                              dep-{template.moduleNumber}-{(template.testIdentifier ?? '').toLowerCase()}-v{template.version}
                           </button>
                        ))}
                     </div>
                  </div>
               )}

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
         <ConfirmDialog {...confirmDialogProps} />
      </>
   )
}
