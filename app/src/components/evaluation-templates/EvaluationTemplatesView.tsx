import { useState, useMemo } from 'react'
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
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [confirmFn, confirmDialogProps] = useConfirm()

  const templatesQuery = useQuery({
    queryKey: ['evaluationTemplates'],
    queryFn: () => db.evaluationTemplates.orderBy('updatedAt').reverse().toArray(),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await db.evaluationTemplates.delete(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluationTemplates'] })
      setExpandedId(null)
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

  const templates = useMemo(() => templatesQuery.data ?? [], [templatesQuery.data])

  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return templates
    const q = searchQuery.toLowerCase()
    return templates.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q) ||
      t.objectives.some(o => o.title.toLowerCase().includes(q))
    )
  }, [templates, searchQuery])

  return (
    <section className="space-y-6">
      {/* ═══════════════════ HEADER ═══════════════════ */}
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
                  <svg className="w-6 h-6 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  Templates de grilles complètes
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  Grilles d'évaluation réutilisables avec objectifs et questions
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats + Search */}
        <div className="px-6 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-sm">
              <span className="font-bold text-slate-900">{templates.length}</span>
              <span className="text-slate-500">template{templates.length > 1 ? 's' : ''}</span>
            </div>
            {templates.length > 0 && (
              <>
                <span className="text-slate-300">|</span>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="w-2 h-2 rounded-full bg-violet-400" />
                  <span className="text-slate-500">
                    {templates.reduce((sum, t) => sum + t.objectives.reduce((s, o) => s + o.indicators.length, 0), 0)} questions au total
                  </span>
                </div>
              </>
            )}
          </div>
          {templates.length > 0 && (
            <div className="relative w-72">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un template…"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none transition-all placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-500 flex items-center justify-center text-xs transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════ INFO VIDE ═══════════════════ */}
      {templates.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <div className="w-16 h-16 mx-auto mb-4 bg-violet-50 rounded-2xl flex items-center justify-center">
            <svg className="w-8 h-8 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-2">Aucun template de grille</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto mb-1">
            Les templates sont créés depuis la <strong>Grille Master</strong> d'un projet.
          </p>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Ouvrez un projet, configurez votre grille, puis cliquez sur « Sauvegarder comme template ».
          </p>
        </div>
      )}

      {/* ═══════════════════ RECHERCHE VIDE ═══════════════════ */}
      {searchQuery && filteredTemplates.length === 0 && templates.length > 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h3 className="text-base font-semibold text-slate-600 mb-1">Aucun résultat</h3>
          <p className="text-sm text-slate-400">Aucun template ne correspond à « {searchQuery} »</p>
        </div>
      )}

      {/* ═══════════════════ GRILLE DES TEMPLATES ═══════════════════ */}
      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {filteredTemplates.map((template: EvaluationTemplate) => {
          const totalQuestions = template.objectives.reduce((sum, obj) => sum + obj.indicators.length, 0)
          const isExpanded = expandedId === template.id

          return (
            <div
              key={template.id}
              className="group bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col overflow-hidden"
            >
              {/* Accent bar */}
              <div className="h-1 bg-violet-500" />

              {/* Content */}
              <div className="p-5 flex-1">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 text-base leading-tight mb-1">{template.name}</h3>
                    {template.description && (
                      <p className="text-sm text-slate-500 line-clamp-2">{template.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="ml-2 w-8 h-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
                    title="Supprimer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                {/* Stats pills */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-50 text-violet-700 border border-violet-200 rounded-md text-[11px] font-bold">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    {template.objectives.length} obj.
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-[11px] font-bold">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {totalQuestions} quest.
                  </span>
                </div>

                {/* Objectives summary */}
                <div className="space-y-1">
                  {template.objectives.slice(0, isExpanded ? undefined : 4).map((obj) => (
                    <div key={obj.id} className="flex items-center gap-2 py-1">
                      <span className="shrink-0 w-5 h-5 rounded bg-violet-100 text-violet-700 border border-violet-200 flex items-center justify-center text-[9px] font-bold">
                        {obj.number}
                      </span>
                      <span className="flex-1 min-w-0 truncate text-[13px] text-slate-700" title={obj.title}>
                        {obj.title}
                      </span>
                      <span className="shrink-0 text-[10px] text-slate-400 font-semibold">
                        {obj.indicators.length}Q · ×{obj.weight}
                      </span>
                    </div>
                  ))}
                  {!isExpanded && template.objectives.length > 4 && (
                    <div className="text-[11px] text-slate-400 pl-7">
                      +{template.objectives.length - 4} objectif{template.objectives.length - 4 > 1 ? 's' : ''} …
                    </div>
                  )}
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-3 max-h-80 overflow-y-auto">
                    <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Détail des questions</h4>
                    {template.objectives.map((objective) => (
                      <div key={objective.id} className="bg-slate-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-5 h-5 bg-violet-600 text-white text-[10px] font-bold rounded flex items-center justify-center">
                            {objective.number}
                          </span>
                          <span className="text-sm font-semibold text-slate-800 flex-1 min-w-0 truncate">{objective.title}</span>
                          <span className="text-[10px] text-slate-400 shrink-0">×{objective.weight}</span>
                        </div>
                        {objective.indicators.length > 0 && (
                          <div className="ml-7 space-y-1">
                            {objective.indicators.map((indicator, qIdx) => (
                              <div key={indicator.id} className="flex items-center gap-1.5 text-xs text-slate-600">
                                <span className="shrink-0 text-[10px] font-bold text-slate-400 w-5">
                                  Q{indicator.questionNumber ?? qIdx + 1}
                                </span>
                                <span className="px-1 py-0.5 bg-slate-200 text-slate-600 rounded text-[9px] font-bold shrink-0">
                                  {indicator.taxonomy}
                                </span>
                                <span className="flex-1 min-w-0 truncate">{indicator.behavior}</span>
                                {indicator.weight !== 1 && (
                                  <span className="text-[10px] text-slate-400 shrink-0">×{indicator.weight}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="bg-slate-50/70 px-5 py-2.5 border-t border-slate-100 mt-auto flex items-center justify-between">
                <span className="text-[10px] text-slate-400">
                  {new Date(template.updatedAt).toLocaleDateString('fr-FR')}
                </span>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : template.id)}
                  className="text-[11px] font-semibold text-violet-600 hover:text-violet-800 transition-colors flex items-center gap-1"
                >
                  {isExpanded ? 'Masquer' : 'Voir détail'}
                  <svg className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <ConfirmDialog {...confirmDialogProps} />
    </section>
  )
}
