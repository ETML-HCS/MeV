import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { db } from '../../lib/db'
import type { ModuleTemplate, ObjectiveTemplate } from '../../types'

interface TemplatesViewProps {
  onBack?: () => void
}

export const TemplatesView = ({ onBack }: TemplatesViewProps) => {
  const queryClient = useQueryClient()
  const [isCreating, setIsCreating] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ModuleTemplate | null>(null)
  const [quickEntryMode, setQuickEntryMode] = useState(false)
  const [quickEntryText, setQuickEntryText] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    moduleNumber: '',
    modulePrefix: '' as 'I' | 'C' | '',
    testIdentifier: '',
    objectives: [] as ObjectiveTemplate[],
  })

  // Charger les templates
  const templatesQuery = useQuery({
    queryKey: ['moduleTemplates'],
    queryFn: () => db.moduleTemplates.orderBy('updatedAt').reverse().toArray(),
  })

  // Créer un template
  const createMutation = useMutation({
    mutationFn: async (template: Omit<ModuleTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
      const newTemplate: ModuleTemplate = {
        ...template,
        id: crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      await db.moduleTemplates.add(newTemplate)
      return newTemplate
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moduleTemplates'] })
      resetForm()
    },
  })

  // Mettre à jour un template
  const updateMutation = useMutation({
    mutationFn: async (template: ModuleTemplate) => {
      await db.moduleTemplates.put({
        ...template,
        updatedAt: new Date(),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moduleTemplates'] })
      resetForm()
    },
  })

  // Supprimer un template
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await db.moduleTemplates.delete(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moduleTemplates'] })
    },
  })

  const resetForm = () => {
    setFormData({ name: '', description: '', moduleNumber: '', modulePrefix: '', testIdentifier: '', objectives: [] })
    setIsCreating(false)
    setEditingTemplate(null)
    setQuickEntryMode(false)
    setQuickEntryText('')
  }

  const parseQuickEntry = () => {
    const lines = quickEntryText.split('\n').filter(line => line.trim())
    const newObjectives: ObjectiveTemplate[] = []
    
    lines.forEach((line, index) => {
      const parts = line.split('|').map(p => p.trim())
      const title = parts[0] || ''
      const weight = parseInt(parts[1]) || 1
      const description = parts[2] || ''
      
      if (title) {
        newObjectives.push({
          id: crypto.randomUUID(),
          number: index + 1,
          title,
          description,
          weight: Math.max(1, Math.min(10, weight)),
        })
      }
    })
    
    setFormData({ ...formData, objectives: newObjectives })
    setQuickEntryMode(false)
    setQuickEntryText('')
  }

  const handleAddObjective = () => {
    setFormData({
      ...formData,
      objectives: [
        ...formData.objectives,
        {
          id: crypto.randomUUID(),
          number: formData.objectives.length + 1,
          title: '',
          description: '',
          weight: 1,
        },
      ],
    })
  }

  const handleUpdateObjective = (index: number, field: keyof ObjectiveTemplate, value: any) => {
    const newObjectives = [...formData.objectives]
    newObjectives[index] = { ...newObjectives[index], [field]: value }
    setFormData({ ...formData, objectives: newObjectives })
  }

  const handleRemoveObjective = (index: number) => {
    const newObjectives = formData.objectives.filter((_, i) => i !== index)
    // Renumeroter
    newObjectives.forEach((obj, i) => {
      obj.number = i + 1
    })
    setFormData({ ...formData, objectives: newObjectives })
  }

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      alert('Veuillez saisir un nom de module')
      return
    }
    if (formData.objectives.length === 0) {
      alert('Veuillez ajouter au moins un objectif')
      return
    }

    if (editingTemplate) {
      updateMutation.mutate({
        ...editingTemplate,
        name: formData.name,
        description: formData.description,
        moduleNumber: formData.moduleNumber || null,
        modulePrefix: formData.modulePrefix || null,
        testIdentifier: formData.testIdentifier || undefined,
        objectives: formData.objectives,
      })
    } else {
      createMutation.mutate({
        name: formData.name,
        description: formData.description,
        moduleNumber: formData.moduleNumber || null,
        modulePrefix: formData.modulePrefix || null,
        testIdentifier: formData.testIdentifier || undefined,
        objectives: formData.objectives,
      })
    }
  }

  const handleEdit = (template: ModuleTemplate) => {
    setEditingTemplate(template)
    setFormData({
      name: template.name,
      description: template.description,
      moduleNumber: template.moduleNumber || '',
      modulePrefix: template.modulePrefix || '',
      testIdentifier: template.testIdentifier || '',
      objectives: template.objectives,
    })
    setIsCreating(true)
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
              <h2 className="text-xl font-bold text-slate-900">Squellettes de modules</h2>
              <p className="text-sm text-slate-500 mt-1">
                Créez des modèles réutilisables avec seulement les objectifs (sans les questions)
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all active:scale-95"
          >
            + Nouveau squelette
          </button>
        </div>
      </div>

      {/* FORMULAIRE CRÉATION/ÉDITION */}
      {isCreating && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900">
              {editingTemplate ? 'Modifier le squelette' : 'Nouveau squelette'}
            </h3>
            <button
              onClick={resetForm}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            {/* Nom du module */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Nom du squelette (ex: DEP-C216)
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="DEP-C216"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
              />
            </div>

            {/* Association Module / EP */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Type de module
                </label>
                <select
                  value={formData.modulePrefix}
                  onChange={(e) => setFormData({ ...formData, modulePrefix: e.target.value as 'I' | 'C' | '' })}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white"
                >
                  <option value="">Aucun</option>
                  <option value="I">I (Informatique)</option>
                  <option value="C">C (Culture générale)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Numéro du module
                </label>
                <input
                  type="text"
                  value={formData.moduleNumber}
                  onChange={(e) => setFormData({ ...formData, moduleNumber: e.target.value })}
                  placeholder="ex: 164"
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Identifiant de l'EP
                </label>
                <input
                  type="text"
                  value={formData.testIdentifier}
                  onChange={(e) => setFormData({ ...formData, testIdentifier: e.target.value })}
                  placeholder="ex: EP1"
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                />
              </div>
            </div>
            <p className="text-xs text-slate-500 -mt-2">
              Si ces 3 champs sont remplis, ce squelette sera automatiquement utilisé lors de la création d'une nouvelle évaluation pour ce module.
            </p>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description du module..."
                rows={2}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all resize-none"
              />
            </div>

            {/* Liste des objectifs */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-slate-700">
                  Objectifs ({formData.objectives.length})
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuickEntryMode(!quickEntryMode)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      quickEntryMode
                        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                    title="Basculer entre saisie normale et saisie rapide"
                  >
                    {quickEntryMode ? '⚙️ Mode détaillé' : '⚡ Saisie rapide'}
                  </button>
                  {!quickEntryMode && (
                    <button
                      onClick={handleAddObjective}
                      className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg hover:bg-emerald-100 transition-colors"
                    >
                      + Ajouter objectif
                    </button>
                  )}
                </div>
              </div>

              {quickEntryMode ? (
                <div className="space-y-3 bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="text-xs text-blue-900 font-semibold">
                    Format : <span className="font-mono">Objectif | Poids | Description</span>
                  </div>
                  <p className="text-[11px] text-blue-700">
                    Entrez un objectif par ligne. Utilisez le pipe (|) pour séparer. Le poids est optionnel (1-10).
                  </p>
                  <textarea
                    value={quickEntryText}
                    onChange={(e) => setQuickEntryText(e.target.value)}
                    placeholder="Titre objectif 1 | 2 | Description
Titre objectif 2 | 1
Titre objectif 3"
                    rows={6}
                    className="w-full px-3 py-2 rounded-lg border border-blue-300 text-sm font-mono focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none resize-none"
                  />
                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={() => {
                        setQuickEntryMode(false)
                        setQuickEntryText('')
                      }}
                      className="px-3 py-1.5 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={parseQuickEntry}
                      disabled={!quickEntryText.trim()}
                      className="px-3 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Importer ({quickEntryText.split('\n').filter(l => l.trim()).length} ligne{quickEntryText.split('\n').filter(l => l.trim()).length !== 1 ? 's' : ''})
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                {formData.objectives.map((obj, index) => (
                  <div key={obj.id} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <div className="flex items-start gap-3">
                      <span className="shrink-0 w-8 h-8 bg-slate-600 text-white rounded-md flex items-center justify-center text-sm font-bold mt-1">
                        O{obj.number}
                      </span>
                      <div className="flex-1 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={obj.title}
                            onChange={(e) => handleUpdateObjective(index, 'title', e.target.value)}
                            placeholder="Titre de l'objectif"
                            className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                          />
                          <input
                            type="number"
                            value={obj.weight}
                            onChange={(e) => handleUpdateObjective(index, 'weight', Number(e.target.value))}
                            placeholder="Poids"
                            min="1"
                            max="10"
                            className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                          />
                        </div>
                        <textarea
                          value={obj.description}
                          onChange={(e) => handleUpdateObjective(index, 'description', e.target.value)}
                          placeholder="Description de l'objectif..."
                          rows={2}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none resize-none"
                        />
                      </div>
                      <button
                        onClick={() => handleRemoveObjective(index)}
                        className="shrink-0 w-8 h-8 text-red-500 hover:bg-red-50 rounded-lg transition-colors mt-1"
                        title="Supprimer"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}

                {formData.objectives.length === 0 && (
                  <div className="text-center py-8 text-slate-400 text-sm">
                    Aucun objectif. Cliquez sur "Ajouter objectif" pour commencer.
                  </div>
                )}
                </div>
              )}
            </div>

            {/* Boutons d'action */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                onClick={resetForm}
                className="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingTemplate ? 'Mettre à jour' : 'Créer le squelette'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LISTE DES TEMPLATES */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <div key={template.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">{template.name}</h3>
                  {template.moduleNumber && template.modulePrefix && template.testIdentifier && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-bold">
                        {template.modulePrefix}{template.moduleNumber}
                      </span>
                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded text-[10px] font-bold">
                        {template.testIdentifier}
                      </span>
                    </div>
                  )}
                  <p className="text-xs text-slate-500 mt-1">
                    {template.objectives.length} objectif{template.objectives.length > 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEdit(template)}
                    className="w-8 h-8 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center"
                    title="Modifier"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Supprimer le squelette "${template.name}" ?`)) {
                        deleteMutation.mutate(template.id)
                      }
                    }}
                    className="w-8 h-8 text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center"
                    title="Supprimer"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              {template.description && (
                <p className="text-sm text-slate-600 mb-3">{template.description}</p>
              )}

              <div className="space-y-1.5">
                {template.objectives.map((obj) => (
                  <div key={obj.id} className="flex items-center gap-2 text-xs">
                    <span className="shrink-0 w-6 h-6 bg-slate-100 text-slate-600 rounded font-bold flex items-center justify-center">
                      O{obj.number}
                    </span>
                    <span className="flex-1 truncate text-slate-700" title={obj.title}>
                      {obj.title}
                    </span>
                    <span className="shrink-0 text-slate-400">×{obj.weight}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 px-5 py-3 border-t border-slate-200">
              <div className="text-[10px] text-slate-500">
                Mis à jour le {new Date(template.updatedAt).toLocaleDateString('fr-FR')}
              </div>
            </div>
          </div>
        ))}

        {templates.length === 0 && !isCreating && (
          <div className="col-span-full text-center py-12 bg-white rounded-xl border border-slate-200">
            <div className="text-4xl mb-3 opacity-30">📋</div>
            <h3 className="text-lg font-semibold text-slate-700 mb-1">Aucun squelette</h3>
            <p className="text-sm text-slate-400">
              Créez votre premier squelette pour gagner du temps lors de la création de modules.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
