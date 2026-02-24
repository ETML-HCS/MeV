import { useState, useMemo, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { db } from '../../lib/db'
import { useConfirm } from '../../hooks/useConfirm'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import type { ModuleTemplate, ObjectiveTemplate } from '../../types'

/* ─────────────────────────── helpers ─────────────────────────── */

const getModuleColor = (prefix: string | null | undefined) => {
  switch (prefix) {
    case 'I': return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700 border-blue-200', accent: 'bg-blue-500' }
    case 'C': return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', accent: 'bg-emerald-500' }
    default:  return { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', badge: 'bg-slate-100 text-slate-700 border-slate-200', accent: 'bg-slate-500' }
  }
}

/* ─────────────────────── TemplateCard ─────────────────────── */

const TemplateCard = ({
  moduleTemplates,
  onEdit,
  onDelete,
}: {
  moduleTemplates: ModuleTemplate[]
  onEdit: (t: ModuleTemplate) => void
  onDelete: (id: string) => void
}) => {
  // Grouper par EP
  const epGroups = useMemo(() => {
    const groups = new Map<string, ModuleTemplate[]>()
    moduleTemplates.forEach(t => {
      const epKey = t.testIdentifier || 'default'
      if (!groups.has(epKey)) groups.set(epKey, [])
      groups.get(epKey)!.push(t)
    })
    return groups
  }, [moduleTemplates])

  const sortedEpKeys = useMemo(() => {
    return Array.from(epGroups.keys()).sort((a, b) => {
      if (a === 'default') return 1
      if (b === 'default') return -1
      return a.localeCompare(b)
    })
  }, [epGroups])

  const [activeEpKey, setActiveEpKey] = useState(sortedEpKeys[0])

  useEffect(() => {
    if (!sortedEpKeys.includes(activeEpKey)) {
      setActiveEpKey(sortedEpKeys[0])
    }
  }, [sortedEpKeys, activeEpKey])

  const activeEpTemplates = epGroups.get(activeEpKey) || []

  const sortedTemplates = useMemo(() => {
    return [...activeEpTemplates].sort((a, b) => (b.version || 1) - (a.version || 1))
  }, [activeEpTemplates])

  const [activeVersionId, setActiveVersionId] = useState(sortedTemplates[0]?.id)

  useEffect(() => {
    if (sortedTemplates.length > 0 && !sortedTemplates.find(t => t.id === activeVersionId)) {
      setActiveVersionId(sortedTemplates[0].id)
    }
  }, [sortedTemplates, activeVersionId])

  const activeTemplate = sortedTemplates.find(t => t.id === activeVersionId) || sortedTemplates[0]
  if (!activeTemplate) return null

  const colors = getModuleColor(activeTemplate.modulePrefix)
  const isSystem = activeTemplate.id.startsWith('sys-')
  const totalWeight = activeTemplate.objectives.reduce((sum, o) => sum + o.weight, 0)

  return (
    <div className="group bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col overflow-hidden">
      {/* Accent bar */}
      <div className={`h-1 ${colors.accent}`} />

      {/* EP tabs */}
      {sortedEpKeys.length > 1 && (
        <div className="flex border-b border-slate-100 bg-slate-50/70 px-4 py-2 gap-1.5">
          {sortedEpKeys.map(epKey => (
            <button
              key={epKey}
              onClick={() => setActiveEpKey(epKey)}
              className={`px-3 py-1 rounded-md text-[11px] font-bold tracking-wide transition-all ${
                activeEpKey === epKey
                  ? `${colors.badge} border shadow-sm`
                  : 'text-slate-400 hover:text-slate-600 hover:bg-white'
              }`}
            >
              {epKey === 'default' ? 'Standard' : epKey}
            </button>
          ))}
        </div>
      )}

      {/* Version selector */}
      {sortedTemplates.length > 1 && (
        <div className="flex border-b border-slate-100 bg-white px-4 py-1.5 gap-1.5">
          {sortedTemplates.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveVersionId(t.id)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                activeVersionId === t.id
                  ? 'bg-violet-100 text-violet-700 border border-violet-200'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
            >
              v{t.version || 1}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="p-5 flex-1">
        {/* Header row */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              {activeTemplate.modulePrefix && activeTemplate.moduleNumber && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${colors.badge}`}>
                  {activeTemplate.modulePrefix}{activeTemplate.moduleNumber}
                </span>
              )}
              {isSystem && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-[10px] font-bold">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
                  </svg>
                  Système
                </span>
              )}
              {activeTemplate.testIdentifier && (
                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-semibold">
                  {activeTemplate.testIdentifier}
                </span>
              )}
            </div>
            <h3 className="font-bold text-slate-900 text-base leading-tight">
              {activeTemplate.name}
            </h3>
            {activeTemplate.description && (
              <p className="text-sm text-slate-500 mt-1 line-clamp-2">{activeTemplate.description}</p>
            )}
          </div>
          <div className="flex items-center gap-0.5 ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(activeTemplate)}
              className="w-8 h-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center"
              title="Modifier"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            {!isSystem && (
              <button
                onClick={() => onDelete(activeTemplate.id)}
                className="w-8 h-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center"
                title="Supprimer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Objectives */}
        <div className="space-y-1">
          {activeTemplate.objectives.map((obj: any) => (
            <div key={obj.id} className="flex items-center gap-2.5 py-1.5">
              <span className={`shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold ${colors.bg} ${colors.text} ${colors.border} border`}>
                {obj.number}
              </span>
              <span className="flex-1 min-w-0 truncate text-[13px] text-slate-700" title={obj.title}>
                {obj.title}
              </span>
              {/* Weight bar */}
              <div className="shrink-0 flex items-center gap-1.5">
                <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${colors.accent}`}
                    style={{ width: `${totalWeight > 0 ? (obj.weight / totalWeight) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400 font-semibold w-4 text-right">×{obj.weight}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-slate-50/70 px-5 py-2.5 border-t border-slate-100 mt-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-400 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            {activeTemplate.objectives.length} objectif{activeTemplate.objectives.length > 1 ? 's' : ''}
          </span>
          <span className="text-[10px] text-slate-400">•</span>
          <span className="text-[10px] text-slate-400">
            Poids total : {totalWeight}
          </span>
        </div>
        <div className="text-[10px] text-slate-400">
          {new Date(activeTemplate.updatedAt).toLocaleDateString('fr-FR')}
        </div>
      </div>
    </div>
  )
}

/* ──────────────────── TemplatesView (main) ──────────────────── */

interface TemplatesViewProps {
  onBack?: () => void
}

export const TemplatesView = ({ onBack }: TemplatesViewProps) => {
  const queryClient = useQueryClient()
  const [isCreating, setIsCreating] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ModuleTemplate | null>(null)
  const [quickEntryMode, setQuickEntryMode] = useState(false)
  const [quickEntryText, setQuickEntryText] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [confirmFn, confirmDialogProps] = useConfirm()
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

  // Mutations
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

  const updateMutation = useMutation({
    mutationFn: async (template: ModuleTemplate) => {
      await db.moduleTemplates.put({ ...template, updatedAt: new Date() })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moduleTemplates'] })
      resetForm()
    },
  })

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
    const newObjectives: ObjectiveTemplate[] = lines.map((line, index) => {
      const parts = line.split('|').map(p => p.trim())
      return {
        id: crypto.randomUUID(),
        number: index + 1,
        title: parts[0] || '',
        description: parts[2] || '',
        weight: Math.max(1, Math.min(10, parseInt(parts[1]) || 1)),
      }
    }).filter(o => o.title)

    setFormData({ ...formData, objectives: newObjectives })
    setQuickEntryMode(false)
    setQuickEntryText('')
  }

  const handleAddObjective = () => {
    setFormData({
      ...formData,
      objectives: [
        ...formData.objectives,
        { id: crypto.randomUUID(), number: formData.objectives.length + 1, title: '', description: '', weight: 1 },
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
    newObjectives.forEach((obj, i) => { obj.number = i + 1 })
    setFormData({ ...formData, objectives: newObjectives })
  }

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      confirmFn({ title: 'Nom requis', message: 'Veuillez saisir un nom de module.', confirmLabel: 'OK', variant: 'warning', hideCancel: true })
      return
    }
    if (formData.objectives.length === 0) {
      confirmFn({ title: 'Objectifs requis', message: 'Veuillez ajouter au moins un objectif.', confirmLabel: 'OK', variant: 'warning', hideCancel: true })
      return
    }

    const payload = {
      name: formData.name,
      description: formData.description,
      moduleNumber: formData.moduleNumber || null,
      modulePrefix: formData.modulePrefix || null,
      testIdentifier: formData.testIdentifier || undefined,
      objectives: formData.objectives,
    }

    if (editingTemplate) {
      updateMutation.mutate({ ...editingTemplate, ...payload })
    } else {
      createMutation.mutate(payload)
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
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const templates = templatesQuery.data ?? []

  // Stats
  const systemCount = templates.filter(t => t.id.startsWith('sys-')).length
  const customCount = templates.length - systemCount

  // Filtrer + Grouper
  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return templates
    const q = searchQuery.toLowerCase()
    return templates.filter(t =>
      t.name.toLowerCase().includes(q) ||
      (t.modulePrefix && t.moduleNumber && `${t.modulePrefix}${t.moduleNumber}`.toLowerCase().includes(q)) ||
      (t.testIdentifier && t.testIdentifier.toLowerCase().includes(q)) ||
      t.objectives.some(o => o.title.toLowerCase().includes(q))
    )
  }, [templates, searchQuery])

  // Regrouper par module pour permettre les radios EP dans chaque card
  const groupedTemplates = useMemo(() => {
    const groups = new Map<string, ModuleTemplate[]>()
    filteredTemplates.forEach(template => {
      const key = template.moduleNumber && template.modulePrefix
        ? `${template.modulePrefix}${template.moduleNumber}`
        : template.name
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(template)
    })
    return Array.from(groups.values()).sort((a, b) => {
      const nameA = a[0].modulePrefix && a[0].moduleNumber ? `${a[0].modulePrefix}${a[0].moduleNumber}` : a[0].name
      const nameB = b[0].modulePrefix && b[0].moduleNumber ? `${b[0].modulePrefix}${b[0].moduleNumber}` : b[0].name
      return nameA.localeCompare(nameB)
    })
  }, [filteredTemplates])

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
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Squelettes de modules
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  Modèles réutilisables avec objectifs pré-configurés
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setIsCreating(true)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg shadow-lg shadow-blue-600/25 transition-all active:scale-95 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nouveau squelette
            </button>
          </div>
        </div>

        {/* Stats bar + Search */}
        <div className="px-6 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-sm">
              <span className="font-bold text-slate-900">{templates.length}</span>
              <span className="text-slate-500">squelette{templates.length > 1 ? 's' : ''}</span>
            </div>
            {systemCount > 0 && (
              <>
                <span className="text-slate-300">|</span>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-slate-500">{systemCount} système</span>
                </div>
              </>
            )}
            {customCount > 0 && (
              <>
                <span className="text-slate-300">|</span>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  <span className="text-slate-500">{customCount} personnalisé{customCount > 1 ? 's' : ''}</span>
                </div>
              </>
            )}
          </div>
          <div className="relative w-72">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              data-shortcut-search="true"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un squelette…"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all placeholder:text-slate-400"
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
        </div>
      </div>

      {/* ═══════════════════ FORMULAIRE ═══════════════════ */}
      {isCreating && (
        <div className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden">
          <div className="bg-linear-to-r from-blue-50 to-blue-50/50 px-6 py-4 border-b border-blue-100">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${editingTemplate ? 'bg-amber-500' : 'bg-blue-500'}`} />
                {editingTemplate ? 'Modifier le squelette' : 'Nouveau squelette'}
              </h3>
              <button
                onClick={resetForm}
                className="w-8 h-8 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-colors flex items-center justify-center"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Nom */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Nom du squelette
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="ex: DEP-C216"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
              />
            </div>

            {/* Module / EP */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Association au module
              </label>
              <div className="grid grid-cols-3 gap-3">
                <select
                  value={formData.modulePrefix}
                  onChange={(e) => setFormData({ ...formData, modulePrefix: e.target.value as 'I' | 'C' | '' })}
                  className="px-3 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white text-sm"
                >
                  <option value="">Type…</option>
                  <option value="I">I – École prof. (80%)</option>
                  <option value="C">C – Cours inter. (20%)</option>
                </select>
                <input
                  type="text"
                  value={formData.moduleNumber}
                  onChange={(e) => setFormData({ ...formData, moduleNumber: e.target.value })}
                  placeholder="N° module (164)"
                  className="px-3 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm"
                />
                <input
                  type="text"
                  value={formData.testIdentifier}
                  onChange={(e) => setFormData({ ...formData, testIdentifier: e.target.value })}
                  placeholder="EP (EP1)"
                  className="px-3 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Ces 3 champs permettent l'association automatique lors de la création d'une évaluation.
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description optionnelle…"
                rows={2}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all resize-none text-sm"
              />
            </div>

            {/* Objectifs */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-slate-700">
                  Objectifs
                  <span className="ml-1.5 text-xs font-normal text-slate-400">({formData.objectives.length})</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuickEntryMode(!quickEntryMode)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                      quickEntryMode
                        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={quickEntryMode ? "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" : "M13 10V3L4 14h7v7l9-11h-7z"} />
                    </svg>
                    {quickEntryMode ? 'Mode détaillé' : 'Saisie rapide'}
                  </button>
                  {!quickEntryMode && (
                    <button
                      onClick={handleAddObjective}
                      className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Ajouter
                    </button>
                  )}
                </div>
              </div>

              {quickEntryMode ? (
                <div className="bg-linear-to-b from-blue-50 to-blue-50/30 rounded-lg p-4 border border-blue-200">
                  <div className="text-xs text-blue-800 font-semibold mb-1">
                    Format : <code className="bg-blue-100 px-1.5 py-0.5 rounded text-[11px]">Objectif | Poids | Description</code>
                  </div>
                  <p className="text-[11px] text-blue-600 mb-3">
                    Un objectif par ligne. Le poids (1-10) et la description sont optionnels.
                  </p>
                  <textarea
                    value={quickEntryText}
                    onChange={(e) => setQuickEntryText(e.target.value)}
                    placeholder={"Titre objectif 1 | 2 | Description\nTitre objectif 2 | 1\nTitre objectif 3"}
                    rows={6}
                    className="w-full px-3 py-2.5 rounded-lg border border-blue-200 text-sm font-mono focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none resize-none bg-white"
                  />
                  <div className="flex items-center justify-end gap-2 mt-3">
                    <button
                      onClick={() => { setQuickEntryMode(false); setQuickEntryText('') }}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-white rounded-lg transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={parseQuickEntry}
                      disabled={!quickEntryText.trim()}
                      className="px-4 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Importer {quickEntryText.split('\n').filter(l => l.trim()).length} ligne{quickEntryText.split('\n').filter(l => l.trim()).length !== 1 ? 's' : ''}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {formData.objectives.map((obj, index) => (
                    <div key={obj.id} className="flex items-start gap-3 bg-slate-50 rounded-lg p-3.5 border border-slate-200 hover:border-slate-300 transition-colors">
                      <span className="shrink-0 w-7 h-7 bg-slate-700 text-white rounded-md flex items-center justify-center text-[11px] font-bold mt-0.5">
                        {obj.number}
                      </span>
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={obj.title}
                            onChange={(e) => handleUpdateObjective(index, 'title', e.target.value)}
                            placeholder="Titre de l'objectif"
                            className="flex-1 px-3 py-1.5 rounded-md border border-slate-300 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                          />
                          <div className="relative w-20">
                            <input
                              type="number"
                              value={obj.weight}
                              onChange={(e) => handleUpdateObjective(index, 'weight', Number(e.target.value))}
                              min="1"
                              max="10"
                              className="w-full px-3 py-1.5 rounded-md border border-slate-300 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-center"
                            />
                            <span className="absolute -top-1.5 right-2 text-[8px] font-bold text-slate-400 bg-slate-50 px-0.5">POIDS</span>
                          </div>
                        </div>
                        <textarea
                          value={obj.description}
                          onChange={(e) => handleUpdateObjective(index, 'description', e.target.value)}
                          placeholder="Description (optionnel)…"
                          rows={1}
                          className="w-full px-3 py-1.5 rounded-md border border-slate-200 text-xs text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none resize-none"
                        />
                      </div>
                      <button
                        onClick={() => handleRemoveObjective(index)}
                        className="shrink-0 w-7 h-7 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors flex items-center justify-center mt-0.5"
                        title="Supprimer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  {formData.objectives.length === 0 && (
                    <div className="text-center py-10 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-lg">
                      <svg className="w-8 h-8 mx-auto mb-2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Aucun objectif. Cliquez sur « Ajouter » ou « Saisie rapide ».
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
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
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {editingTemplate ? 'Mettre à jour' : 'Créer le squelette'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════ LISTE ═══════════════════ */}
      {searchQuery && filteredTemplates.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h3 className="text-base font-semibold text-slate-600 mb-1">Aucun résultat</h3>
          <p className="text-sm text-slate-400">Aucun squelette ne correspond à « {searchQuery} »</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {groupedTemplates.map((groupTemplates) => {
          const key = groupTemplates[0].modulePrefix && groupTemplates[0].moduleNumber
            ? `${groupTemplates[0].modulePrefix}${groupTemplates[0].moduleNumber}`
            : groupTemplates[0].id
          return (
            <TemplateCard
              key={key}
              moduleTemplates={groupTemplates}
              onEdit={handleEdit}
              onDelete={async (id) => {
                const ok = await confirmFn({
                  title: 'Supprimer ce squelette ?',
                  message: 'Cette action est irréversible.',
                  confirmLabel: 'Supprimer',
                  variant: 'danger',
                })
                if (ok) deleteMutation.mutate(id)
              }}
            />
          )
        })}
      </div>

      {/* Empty state */}
      {templates.length === 0 && !isCreating && !searchQuery && (
          <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
            <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-1">Aucun squelette</h3>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">
              Créez votre premier squelette pour gagner du temps lors de vos prochaines évaluations.
            </p>
            <button
              onClick={() => setIsCreating(true)}
              className="mt-5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all active:scale-95"
            >
              Créer un squelette
            </button>
          </div>
        )}
      

      <ConfirmDialog {...confirmDialogProps} />
    </section>
  )
}
