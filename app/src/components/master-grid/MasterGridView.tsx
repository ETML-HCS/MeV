import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { calculateGridTotals } from '../../lib/calculations'
import { db } from '../../lib/db'
import { useConfirm } from '../../hooks/useConfirm'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import type { AppSettings, Objective, EvaluationTemplate } from '../../types'

interface MasterGridViewProps {
  objectives: Objective[]
  settings: AppSettings
  onImportFromTemplate?: (objectivesFromTemplate: Omit<Objective, 'id' | 'indicators'>[]) => void
}

// Fonction utilitaire pour tronquer le texte
const truncateText = (text: string | undefined, maxChars: number, maxLines?: number): string => {
  if (!text) return '—'
  
  if (maxLines) {
    const lines = text.split('\n').slice(0, maxLines).join('\n')
    if (lines.length > maxChars) {
      return lines.substring(0, maxChars) + '...'
    }
    return lines
  }
  
  if (text.length > maxChars) {
    return text.substring(0, maxChars) + '...'
  }
  return text
}

export const MasterGridView = ({ objectives, settings, onImportFromTemplate }: MasterGridViewProps) => {
  const queryClient = useQueryClient()
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')
  const [confirmFn, confirmDialogProps] = useConfirm()
  const { maxPoints } = calculateGridTotals(objectives, [])
  const totalIndicators = objectives.reduce((sum, objective) => sum + objective.indicators.length, 0)

  // Charger les templates disponibles
  // CRITICAL FIX #4: Use evaluationTemplates consistently
  const templatesQuery = useQuery({
    queryKey: ['evaluationTemplates'],
    queryFn: () => db.evaluationTemplates.toArray(),
  })

  const templates = templatesQuery.data ?? []

  // Mutation pour sauvegarder comme template
  const saveTemplateMutation = useMutation({
    mutationFn: async (template: Omit<EvaluationTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
      const newTemplate: EvaluationTemplate = {
        ...template,
        id: crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      await db.evaluationTemplates.add(newTemplate)
      return newTemplate
    },
    onSuccess: () => {
      // CRITICAL FIX #4: Invalidate correct query key
      queryClient.invalidateQueries({ queryKey: ['evaluationTemplates'] })
      setShowSaveTemplateModal(false)
      setTemplateName('')
      setTemplateDescription('')
      confirmFn({
        title: 'Template sauvegardé',
        message: 'La grille a été sauvegardée comme template avec succès.',
        confirmLabel: 'OK',
        hideCancel: true,
      })
    },
  })

  const handleSaveAsTemplate = () => {
    if (!templateName.trim()) {
      confirmFn({
        title: 'Nom requis',
        message: 'Veuillez saisir un nom pour le template.',
        confirmLabel: 'OK',
        variant: 'warning',
        hideCancel: true,
      })
      return
    }
    if (objectives.length === 0) {
      confirmFn({
        title: 'Grille vide',
        message: 'La grille est vide, rien à sauvegarder.',
        confirmLabel: 'OK',
        variant: 'warning',
        hideCancel: true,
      })
      return
    }

    saveTemplateMutation.mutate({
      name: templateName.trim(),
      description: templateDescription.trim(),
      objectives: objectives,
    })
  }

  const handleImportTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    if (!template || !onImportFromTemplate) return

    const baseObjectives = template.objectives.map(obj => ({
      number: obj.number,
      title: obj.title,
      description: obj.description,
      weight: obj.weight,
    }))

    onImportFromTemplate(baseObjectives)
    setShowTemplateSelector(false)
  }

  if (objectives.length === 0) {
    return (
      <section className="space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
          <div className="mx-auto mb-4 w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
            <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.172a2 2 0 011.414.586l4.828 4.828A2 2 0 0119 9.828V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-700 mb-1">Aucun objectif défini</h3>
          <p className="text-sm text-slate-500">Créez des objectifs dans l'onglet Objectifs pour générer la grille master.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 lg:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Grille Master</h2>
            <p className="text-xs text-slate-500 mt-1">
              {objectives.length} objectif{objectives.length > 1 ? 's' : ''} · {totalIndicators} question{totalIndicators > 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {onImportFromTemplate && objectives.length === 0 && templates.length > 0 && (
              <button
                onClick={() => setShowTemplateSelector(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all active:scale-95 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Importer depuis squelette
              </button>
            )}
            {objectives.length > 0 && (
              <button
                onClick={() => setShowSaveTemplateModal(true)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all active:scale-95 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Sauvegarder comme template
              </button>
            )}
            <div className="px-3.5 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm font-semibold">
              Points max: {maxPoints.toFixed(0)}
            </div>
          </div>
        </div>

        <div className="space-y-3 mt-5">
          {/* Row 1: Test, Module, Correcteur badges */}
          <div className="flex flex-wrap gap-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 flex-1 min-w-40">
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold shrink-0">Test</span>
                <span className="text-sm text-slate-800 font-bold truncate" title={settings.testIdentifier || ''}>{truncateText(settings.testIdentifier, 15)}</span>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 flex-1 min-w-48">
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold shrink-0">Module</span>
                <span className="text-sm text-slate-800 font-bold truncate" title={settings.moduleName || ''}>{truncateText(settings.moduleName, 20)}</span>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 flex-1 min-w-40">
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold shrink-0">Correcteur</span>
                <span className="text-sm text-slate-800 font-bold truncate" title={settings.correctedBy || ''}>{truncateText(settings.correctedBy, 15)}</span>
              </div>
            </div>
          </div>

          {/* Row 2: Description full width with scroll */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
            <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">Description</div>
            <div className="text-xs text-slate-800 font-medium max-h-32 overflow-y-auto" title={settings.moduleDescription || ''}>{settings.moduleDescription || '—'}</div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm table-fixed">
            <colgroup>
              <col className="w-[34%]" />
              <col className="w-[8%]" />
              <col className="w-[20%]" />
              <col className="w-[10%]" />
              <col className="w-[14%]" />
              <col className="w-[14%]" />
            </colgroup>
            <thead>
              <tr className="bg-slate-900 text-white text-xs uppercase tracking-wider sticky top-0 z-10">
                <th className="border border-slate-700 px-4 py-3 text-left font-semibold min-w-72">Objectifs et comportements</th>
                <th className="border border-slate-700 px-4 py-3 text-center w-20 font-semibold">Poids</th>
                <th className="border border-slate-700 px-4 py-3 text-left font-semibold min-w-48">Révélateurs attendus</th>
                <th className="border border-slate-700 px-4 py-3 text-center w-28 font-semibold">Points</th>
                <th className="border border-slate-700 px-4 py-3 text-left font-semibold w-56">Remarques perso.</th>
                <th className="border border-slate-700 px-4 py-3 text-left font-semibold w-56">Remarques générales</th>
              </tr>
            </thead>
            {objectives.map((objective) => {
                const objectiveIndicatorsWeight = objective.indicators.reduce((sum, indicator) => sum + indicator.weight, 0)
                return (
                  <tbody key={objective.id}>
                    {/* Objective row */}
                    <tr className="bg-blue-50 border-t-2 border-blue-200">
                      <td className="border border-slate-200 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="shrink-0 w-7 h-7 bg-blue-600 text-white rounded-md flex items-center justify-center text-xs font-bold">
                            {objective.number}
                          </span>
                          <div>
                            <div className="font-bold text-slate-900">{objective.title}</div>
                            {objective.description && (
                              <div className="text-xs text-slate-500 mt-0.5">{objective.description}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="border border-slate-200 px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center min-w-8 px-2 py-1 rounded-md bg-blue-100 text-blue-700 font-bold text-xs">
                          {objective.weight}
                        </span>
                      </td>
                      <td className="border border-slate-200 px-4 py-3 text-xs text-slate-600" colSpan={4}>
                        {objective.indicators.map((indicator) => indicator.behavior).join(' · ')}
                      </td>
                    </tr>

                    {/* Question rows */}
                    {objective.indicators.map((indicator, index) => (
                      <tr key={`${objective.id}-${indicator.id}`} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        <td className="border border-slate-200 px-4 py-2.5">
                          <div className="flex items-center gap-2 pl-4">
                            <span className="shrink-0 w-6 h-6 bg-slate-100 border border-slate-200 rounded text-[10px] font-bold text-slate-500 flex items-center justify-center">
                              Q{index + 1}
                            </span>
                            <span className="text-sm text-slate-700">{indicator.behavior}</span>
                          </div>
                        </td>
                        <td className="border border-slate-200 px-4 py-2.5 text-center text-slate-600 font-medium">{indicator.weight}</td>
                        <td className="border border-slate-200 px-4 py-2.5 text-xs text-slate-500 whitespace-pre-line" colSpan={4}>
                          {indicator.expectedResults || indicator.conditions || '—'}
                        </td>
                      </tr>
                    ))}

                    {/* Taux row - Compact */}
                    <tr className="bg-orange-50/70 border-t border-orange-200">
                      <td className="border border-slate-200 px-4 py-2 text-xs font-semibold text-orange-700">
                        Objectif {objective.number}
                      </td>
                      <td className="border border-slate-200 px-4 py-2 text-center text-xs font-bold text-orange-700">
                        {objectiveIndicatorsWeight}
                      </td>
                      <td className="border border-slate-200 px-4 py-2" colSpan={4}>
                      </td>
                    </tr>
                  </tbody>
                )
              })}

            <tbody>
              {/* Footer total */}
              <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold">
                <td className="border border-slate-200 px-4 py-3 text-right text-slate-700">Total points max</td>
                <td className="border border-slate-200 px-4 py-3 text-center text-lg text-blue-700">{maxPoints.toFixed(0)}</td>
                <td className="border border-slate-200 px-4 py-3" colSpan={4}>
                  <div className="flex items-center justify-end gap-3">
                    <span className="text-slate-700">Points obtenus</span>
                    <span className="text-lg text-slate-400">0</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE SÉLECTION DE TEMPLATE */}
      {showTemplateSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowTemplateSelector(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Importer depuis un squelette</h3>
              <button
                onClick={() => setShowTemplateSelector(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-3">
              {templates.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3 opacity-30">📋</div>
                  <p className="text-slate-500">Aucun squelette disponible.</p>
                  <p className="text-sm text-slate-400 mt-1">Créez-en un dans la page Squelettes.</p>
                </div>
              ) : (
                templates.map((template) => (
                  <div
                    key={template.id}
                    className="bg-slate-50 rounded-lg border border-slate-200 p-4 hover:bg-slate-100 hover:border-blue-300 cursor-pointer transition-all"
                    onClick={() => handleImportTemplate(template.id)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-bold text-slate-900">{template.name}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {template.objectives.length} objectif{template.objectives.length > 1 ? 's' : ''}
                        </p>
                      </div>
                      <button className="px-3 py-1 bg-purple-600 text-white text-xs font-semibold rounded hover:bg-purple-700 transition-colors">
                        Importer
                      </button>
                    </div>
                    {template.description && (
                      <p className="text-sm text-slate-600 mb-2">{template.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {template.objectives.map((obj) => (
                        <span key={obj.id} className="px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-700">
                          O{obj.number}: {obj.title} (×{obj.weight})
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4">
              <button
                onClick={() => setShowTemplateSelector(false)}
                className="w-full px-4 py-2 bg-white border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-100 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE SAUVEGARDE COMME TEMPLATE */}
      {showSaveTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowSaveTemplateModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="bg-green-600 px-6 py-4 rounded-t-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                <h3 className="text-lg font-bold text-white">Sauvegarder comme template</h3>
              </div>
              <button
                onClick={() => setShowSaveTemplateModal(false)}
                className="w-8 h-8 rounded-lg text-white hover:bg-green-700 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-green-800">
                    <p className="font-semibold mb-1">Grille complète sauvegardée</p>
                    <p>Cette grille contient <strong>{objectives.length} objectif{objectives.length > 1 ? 's' : ''}</strong> et <strong>{totalIndicators} question{totalIndicators > 1 ? 's' : ''}</strong>. Elle pourra être réutilisée dans de futurs projets.</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Nom du template <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Ex: C216 IoT - Grille complète"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Description (optionnelle)
                </label>
                <textarea
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="Ex: Évaluation complète pour le module IoT trimestre 1"
                  rows={3}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-3 rounded-b-xl">
              <button
                onClick={() => setShowSaveTemplateModal(false)}
                className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-100 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveAsTemplate}
                disabled={!templateName.trim() || saveTemplateMutation.isPending}
                className="px-5 py-2.5 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              >
                {saveTemplateMutation.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog {...confirmDialogProps} />
    </section>
  )
}
