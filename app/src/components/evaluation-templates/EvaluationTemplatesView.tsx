import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { db } from '../../lib/db'
import { useConfirm } from '../../hooks/useConfirm'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import type { EvaluationTemplate } from '../../types'

interface EvaluationTemplatesViewProps {
  onBack?: () => void
}

export const EvaluationTemplatesView = ({ onBack }: EvaluationTemplatesViewProps) => {
  const queryClient = useQueryClient()
  const [selectedTemplate, setSelectedTemplate] = useState<EvaluationTemplate | null>(null)
  const [confirmFn, confirmDialogProps] = useConfirm()

  // Charger les templates
  const templatesQuery = useQuery({
    queryKey: ['evaluationTemplates'],
    queryFn: () => db.evaluationTemplates.orderBy('updatedAt').reverse().toArray(),
  })

  // Supprimer un template
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await db.evaluationTemplates.delete(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluationTemplates'] })
      setSelectedTemplate(null)
    },
  })

  const handleDelete = async (id: string) => {
    const ok = await confirmFn({
      title: 'Supprimer ce template ?',
      message: 'Cette action est irréversible.',
      confirmLabel: 'Supprimer',
      variant: 'danger',
    })
    if (ok) deleteMutation.mutate(id)
  }

  const templates = templatesQuery.data ?? []

  return (
    <section className="space-y-6">
      {/* HEADER */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Retour
              </button>
            )}
            <div>
              <h2 className="text-xl font-bold text-slate-900">Templates de grilles complètes</h2>
              <p className="text-sm text-slate-500 mt-1">
                Grilles d'évaluation réutilisables avec objectifs et questions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1.5 bg-green-100 text-green-700 text-sm font-semibold rounded-lg">
              {templates.length} template{templates.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* INFO: Comment créer un template */}
      {templates.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">Comment créer un template ?</h3>
              <p className="text-sm text-blue-700">
                Pour sauvegarder une grille comme template, ouvrez un projet et allez dans{' '}
                <span className="font-semibold">Grille Master</span>, puis cliquez sur{' '}
                <span className="font-semibold">"Sauvegarder comme template"</span>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* LISTE DES TEMPLATES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {templates.map((template: EvaluationTemplate) => (
          <div
            key={template.id}
            className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900 mb-1">{template.name}</h3>
                  {template.description && (
                    <p className="text-sm text-slate-600">{template.description}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(template.id)}
                  className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-lg transition-all"
                  title="Supprimer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span className="font-semibold">{template.objectives.length}</span> objectif{template.objectives.length > 1 ? 's' : ''}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-semibold">
                    {template.objectives.reduce((sum: number, obj) => sum + obj.indicators.length, 0)}
                  </span> question{template.objectives.reduce((sum: number, obj) => sum + obj.indicators.length, 0) > 1 ? 's' : ''}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {new Date(template.updatedAt).toLocaleDateString('fr-FR')}
                </div>
              </div>

              <button
                onClick={() => setSelectedTemplate(selectedTemplate?.id === template.id ? null : template)}
                className="w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-all"
              >
                {selectedTemplate?.id === template.id ? 'Masquer le détail' : 'Voir le détail'}
              </button>

              {/* DÉTAIL DU TEMPLATE */}
              {selectedTemplate?.id === template.id && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <h4 className="text-sm font-bold text-slate-700 mb-3">Objectifs et questions :</h4>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {template.objectives.map((objective) => (
                      <div key={objective.id} className="bg-slate-50 rounded-lg p-3">
                        <div className="flex items-start gap-2 mb-2">
                          <span className="shrink-0 w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                            {objective.number}
                          </span>
                          <div className="flex-1">
                            <h5 className="text-sm font-semibold text-slate-900">{objective.title}</h5>
                            {objective.description && (
                              <p className="text-xs text-slate-600 mt-1">{objective.description}</p>
                            )}
                          </div>
                          <span className="text-xs text-slate-500 font-medium">x{objective.weight}</span>
                        </div>
                        {objective.indicators.length > 0 && (
                          <div className="ml-8 space-y-1.5">
                            {objective.indicators.map((indicator, qIdx) => (
                              <div key={indicator.id} className="text-xs text-slate-700">
                                <span className="font-semibold text-slate-500">Q{indicator.questionNumber ?? qIdx + 1}.</span>{' '}
                                {indicator.taxonomy} - {indicator.behavior}
                                {indicator.weight !== 1 && (
                                  <span className="ml-1 text-slate-500">(x{indicator.weight})</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog {...confirmDialogProps} />
    </section>
  )
}
