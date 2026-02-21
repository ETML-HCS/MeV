import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createProject, deleteProject, duplicateProject, getProjects, updateProject, createEvaluation, downloadProjectBackup, downloadAllProjectsBackup, importDatabase, db } from '../../lib/db'
import { parseProjectName, getModuleCardColors } from '../../utils/helpers'
import { useConfirm } from '../../hooks/useConfirm'
import { ConfirmDialog } from '../shared/ConfirmDialog'

interface ProjectsListViewProps {
  onSelectProject: (projectId: string) => void
  onOpenTemplates: () => void
  onOpenEvaluationTemplates: () => void
}

export const ProjectsListView = ({ onSelectProject, onOpenTemplates, onOpenEvaluationTemplates }: ProjectsListViewProps) => {
  const queryClient = useQueryClient()
  const [newProjectName, setNewProjectName] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [editingModuleName, setEditingModuleName] = useState<string | null>(null)
  const [editingProjectName, setEditingProjectName] = useState('')
  const [exportStatus, setExportStatus] = useState<'idle' | 'exporting' | 'importing'>('idle')
  const [exportingProjectId, setExportingProjectId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [confirm, confirmDialogProps] = useConfirm()

  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: getProjects,
  })

  const evaluationTemplatesQuery = useQuery({
    queryKey: ['evaluationTemplates'],
    queryFn: () => db.evaluationTemplates.toArray(),
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const project = await createProject(newProjectName || 'Nouvelle évaluation', '')
      
      // Si un template est sélectionné, importer les objectifs
      if (selectedTemplateId) {
        const template = evaluationTemplatesQuery.data?.find(t => t.id === selectedTemplateId)
        if (template) {
          // Créer de nouveaux objectifs avec des IDs uniques
          const newObjectives = template.objectives.map(obj => ({
            ...obj,
            id: crypto.randomUUID(),
            indicators: obj.indicators.map(ind => ({
              ...ind,
              id: crypto.randomUUID(),
            }))
          }))
          
          // Mettre à jour le projet avec les objectifs
          await updateProject({
            ...project,
            objectives: newObjectives,
          })
        }
      }
      
      return project
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setNewProjectName('')
      setSelectedTemplateId(null)
      setShowCreateForm(false)
      onSelectProject(project.id)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })

  const duplicateMutation = useMutation({
    mutationFn: duplicateProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: updateProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setEditingModuleName(null)
      setEditingProjectName('')
    },
  })

  const createEvaluationMutation = useMutation({
    mutationFn: createEvaluation,
    onSuccess: (newEvaluation) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      onSelectProject(newEvaluation.id)
    },
  })

  const exportProjectMutation = useMutation({
    mutationFn: (projectId: string) => downloadProjectBackup(projectId, projects.find(p => p.id === projectId)?.name),
    onSettled: () => {
      setExportStatus('idle')
      setExportingProjectId(null)
    },
  })

  const exportAllProjectsMutation = useMutation({
    mutationFn: downloadAllProjectsBackup,
    onSettled: () => {
      setExportStatus('idle')
    },
  })

  const projects = projectsQuery.data ?? []
  const evaluationTemplates = evaluationTemplatesQuery.data ?? []

  const handleCreate = async () => {
    await createMutation.mutateAsync()
  }

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Supprimer l\'\u00e9valuation',
      message: '\u00cates-vous s\u00fbr de vouloir supprimer cette \u00e9valuation ?\n\nCette action est irr\u00e9versible.',
      confirmLabel: 'Supprimer',
      variant: 'danger',
    })
    if (ok) deleteMutation.mutate(id)
  }

  const handleDuplicate = (id: string) => {
    duplicateMutation.mutate(id)
  }

  const handleStartEdit = async (moduleName: string) => {
    setEditingModuleName(moduleName)
    setEditingProjectName(moduleName)
  }

  const handleSaveEdit = async (oldName: string) => {
    if (!editingProjectName.trim()) {
      setEditingModuleName(null)
      return
    }
    
    const newName = editingProjectName.trim()
    const moduleToUpdate = modulesByName.find(m => m.name === oldName)
    
    if (moduleToUpdate && newName !== oldName) {
      // Mettre à jour tous les projets de ce module
      await Promise.all(moduleToUpdate.evaluations.map(project => 
        updateMutation.mutateAsync({
          ...project,
          name: newName,
          updatedAt: new Date(),
        })
      ))
    }
    
    setEditingModuleName(null)
    setEditingProjectName('')
  }

  const handleCancelEdit = () => {
    setEditingModuleName(null)
    setEditingProjectName('')
  }

  const handleExportProject = (projectId: string) => {
    setExportStatus('exporting')
    setExportingProjectId(projectId)
    exportProjectMutation.mutate(projectId)
  }

  const handleExportAllProjects = () => {
    setExportStatus('exporting')
    exportAllProjectsMutation.mutate()
  }

  const handleImportBackup = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        setExportStatus('importing')
        const text = await file.text()
        
        const ok = await confirm({
          title: 'Restaurer les données',
          message: 'ATTENTION : Cette action remplacera toutes vos données actuelles par celles du fichier de sauvegarde.\n\nVoulez-vous continuer ?',
          confirmLabel: 'Restaurer',
          variant: 'danger',
        })
        
        if (ok) {
          await importDatabase(text, { merge: false })
          queryClient.invalidateQueries({ queryKey: ['projects'] })
          // Recharger la page pour s'assurer que tout l'état est propre
          window.location.reload()
        } else {
          setExportStatus('idle')
        }
      } catch (error) {
        console.error('Erreur lors de l\'import:', error)
        alert(`Erreur lors de l'import : ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
        setExportStatus('idle')
      }
    }
    input.click()
  }

  // Grouper les projets par nom (qui représente le module/classe)
  const modulesByName = useMemo(() => {
    const map = new Map<string, {
      name: string;
      parsed: ReturnType<typeof parseProjectName>;
      evaluations: typeof projects;
    }>()

    projects.forEach(project => {
      const name = project.name
      if (!map.has(name)) {
        map.set(name, {
          name,
          parsed: parseProjectName(name),
          evaluations: []
        })
      }
      map.get(name)!.evaluations.push(project)
    })

    // Trier les évaluations dans chaque module par EP (EP1, EP2, etc.)
    map.forEach(module => {
      module.evaluations.sort((a, b) => {
        const epA = parseInt(a.settings.testIdentifier?.replace(/\D/g, '') || '0')
        const epB = parseInt(b.settings.testIdentifier?.replace(/\D/g, '') || '0')
        return epA - epB
      })
    })

    return Array.from(map.values())
  }, [projects])

  // Grouper les modules par type (C, I, Numérique, Autres)
  const groupedModules = useMemo(() => {
    const acc: Record<string, typeof modulesByName> = {}
    modulesByName.forEach(module => {
      const groupType = module.parsed.groupType
      if (!acc[groupType]) {
        acc[groupType] = []
      }
      acc[groupType].push(module)
    })
    return acc
  }, [modulesByName])

  // Trier les groupes : C, I, Numérique, Autres
  const groupOrder = { 'C': 1, 'I': 2, 'Numérique': 3, 'Autres': 4 }

  // Filtrer les modules par recherche
  const filteredGroupedModules = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return groupedModules
    const filtered: Record<string, typeof modulesByName> = {}
    Object.entries(groupedModules).forEach(([group, modules]) => {
      const matching = modules.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.evaluations.some(e =>
          (e.settings.testIdentifier || '').toLowerCase().includes(q) ||
          (e.description || '').toLowerCase().includes(q)
        )
      )
      if (matching.length > 0) filtered[group] = matching
    })
    return filtered
  }, [groupedModules, searchQuery])

  const sortedGroups = Object.keys(filteredGroupedModules).sort((a, b) => {
    return groupOrder[a as keyof typeof groupOrder] - groupOrder[b as keyof typeof groupOrder]
  })

  // Trier les modules à l'intérieur de chaque groupe par ordre alphabétique
  sortedGroups.forEach(group => {
    filteredGroupedModules[group].sort((a, b) => a.name.localeCompare(b.name))
  })

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 bg-linear-to-r from-slate-900 to-slate-800">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Module d'Évaluation</h1>
              <p className="text-xs text-slate-400 mt-0.5">{projects.length} évaluation{projects.length !== 1 ? 's' : ''} enregistrée{projects.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              {/* Search */}
              <div className="relative">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filtrer..."
                  className="w-40 pl-8 pr-3 py-2 bg-white/10 border border-white/20 text-white text-xs rounded-lg placeholder-slate-400 focus:bg-white/20 focus:border-white/40 focus:outline-none transition-all"
                />
              </div>
              <button
                onClick={onOpenTemplates}
                title="Squelettes de projets"
                className="px-3 py-2 bg-white/10 border border-white/20 text-white text-xs font-semibold rounded-lg hover:bg-white/20 transition-all flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Squelettes
              </button>
              <button
                onClick={onOpenEvaluationTemplates}
                title="Templates de grilles d'évaluation"
                className="px-3 py-2 bg-white/10 border border-white/20 text-white text-xs font-semibold rounded-lg hover:bg-white/20 transition-all flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                Templates
              </button>
              <button
                onClick={handleExportAllProjects}
                disabled={exportStatus !== 'idle' || projects.length === 0}
                title="Exporte tous les MEV dans une archive ZIP"
                className="px-3 py-2 bg-white/10 border border-white/20 text-white text-xs font-semibold rounded-lg hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {exportStatus === 'exporting' ? '...' : 'Tout sauver'}
              </button>
              <button
                onClick={handleImportBackup}
                disabled={exportStatus !== 'idle'}
                title="Restaurer une sauvegarde JSON"
                className="px-3 py-2 bg-white/10 border border-white/20 text-white text-xs font-semibold rounded-lg hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {exportStatus === 'importing' ? '...' : 'Restaurer'}
              </button>
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  showCreateForm
                    ? 'bg-slate-600 text-white hover:bg-slate-500'
                    : 'bg-blue-500 text-white hover:bg-blue-400 shadow-lg shadow-blue-500/30'
                }`}
              >
                {showCreateForm ? '✕ Annuler' : '+ Nouvelle'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Nom de l'évaluation
              </label>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="ex: Module 164 - Hiver 2026"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none transition-all bg-slate-50/50 hover:border-slate-300"
              />
            </div>
            {evaluationTemplates.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Importer depuis template (optionnel)
                </label>
                <select
                  value={selectedTemplateId || ''}
                  onChange={(e) => setSelectedTemplateId(e.target.value || null)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:border-green-500 focus:ring-1 focus:ring-green-100 outline-none transition-all bg-slate-50/50 hover:border-slate-300"
                >
                  <option value="">-- Aucun template --</option>
                  {evaluationTemplates.map(template => (
                    <option key={template.id} value={template.id}>
                      {template.name} ({template.objectives.length} obj, {template.objectives.reduce((sum, obj) => sum + obj.indicators.length, 0)} q)
                    </option>
                  ))}
                </select>
                {selectedTemplateId && (
                  <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    La grille sera importée automatiquement
                  </p>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={createMutation.isPending || !newProjectName.trim()}
                className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {createMutation.isPending ? 'Création en cours...' : 'Créer l\'évaluation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-700">Aucune évaluation</p>
          <p className="text-xs text-slate-400 mt-1">Créez votre première évaluation pour commencer</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedGroups.map((groupType) => (
            <div key={groupType} className="space-y-3">
              {/* Module Header */}
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 rounded-full bg-slate-800" />
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                  {groupType === 'C' ? 'Cours interentreprises (Pondération 20%)' :
                   groupType === 'I' ? 'École professionnelle (Pondération 80%)' :
                   groupType === 'Numérique' ? 'Modules Numériques' :
                   'Autres évaluations'}
                </h2>
                <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
                  {filteredGroupedModules[groupType].length}
                </span>
              </div>

              {/* Projects Grid for this module */}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {filteredGroupedModules[groupType].map((module) => {
            const parsed = module.parsed
            const cardColors = getModuleCardColors(parsed.groupType)

            return (
            <div
              key={module.name}
              className={`${cardColors} rounded-xl border shadow-sm hover:shadow-md transition-all group/card flex flex-col`}
            >
              <div className="p-4 space-y-3 flex-1">
                {/* Title + Badges */}
                <div>
                  {editingModuleName === module.name ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editingProjectName}
                        onChange={(e) => setEditingProjectName(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit(module.name)
                          if (e.key === 'Escape') handleCancelEdit()
                        }}
                        className="w-full border border-blue-300 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none transition-all bg-blue-50"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(module.name)}
                          disabled={updateMutation.isPending}
                          className="px-3 py-1 bg-emerald-600 text-white text-xs font-semibold rounded hover:bg-emerald-700 disabled:opacity-40 transition-all"
                        >
                          Valider
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-3 py-1 bg-slate-200 text-slate-700 text-xs font-semibold rounded hover:bg-slate-300 transition-all"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <h3
                          onClick={() => handleStartEdit(module.name)}
                          className="text-sm font-bold text-slate-900 truncate hover:text-blue-600 cursor-pointer transition-colors flex-1 group/edit flex items-center gap-1.5"
                          title="Cliquer pour éditer le nom"
                        >
                          <span className="truncate">{module.name}</span>
                          <svg className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover/edit:opacity-100 transition-opacity shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </h3>
                      </div>
                      <div className="flex items-center gap-1 flex-wrap">
                        {parsed.identificationModule && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            parsed.groupType === 'I'
                              ? 'bg-emerald-100 text-emerald-700'
                              : parsed.groupType === 'C'
                              ? 'bg-blue-100 text-blue-700'
                              : parsed.groupType === 'Numérique'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-violet-100 text-violet-700'
                          }`}>
                            {parsed.identificationModule}
                          </span>
                        )}
                        {parsed.trimestreAcademique && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">
                            {parsed.trimestreAcademique}
                          </span>
                        )}
                        {parsed.groupeLabo && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">
                            {parsed.groupeLabo}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {module.evaluations[0]?.description && !editingModuleName && (
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{module.evaluations[0].description}</p>
                  )}
                </div>
              </div>

              {/* Evaluations List */}
              <div className="border-t border-slate-200/60 bg-white/50 rounded-b-xl p-2 space-y-1">
                {module.evaluations.map(evaluation => {
                  const validGrids = evaluation.grids.filter(g => evaluation.students.some(s => s.id === g.studentId));
                  const completedCount = validGrids.filter(g => g.completedAt).length;
                  
                  return (
                  <div key={evaluation.id} className="flex items-center justify-between p-2 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200 hover:shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700 w-8">
                        {evaluation.settings.testIdentifier || 'EP?'}
                      </span>
                      <div className="flex gap-2 text-[10px] text-slate-500">
                        <span title="Élèves">{evaluation.students.length} <svg className="w-3 h-3 inline -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg></span>
                        <span title="Évaluations terminées">{completedCount}/{evaluation.students.length} <svg className="w-3 h-3 inline -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg></span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => onSelectProject(evaluation.id)}
                        className="px-2 py-1 bg-blue-100 text-blue-700 hover:bg-blue-600 hover:text-white text-[10px] font-bold rounded transition-all"
                      >
                        Ouvrir
                      </button>
                      <button
                        onClick={() => handleExportProject(evaluation.id)}
                        disabled={exportingProjectId === evaluation.id}
                        className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-all disabled:opacity-40"
                        title="Télécharger sauvegarde"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDuplicate(evaluation.id)}
                        disabled={duplicateMutation.isPending}
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all disabled:opacity-40"
                        title="Dupliquer"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(evaluation.id)}
                        disabled={deleteMutation.isPending}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all disabled:opacity-40"
                        title="Supprimer"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  )
                })}
                
                {/* Add new evaluation button */}
                <button
                  onClick={() => createEvaluationMutation.mutate(module.evaluations[0].id)}
                  disabled={createEvaluationMutation.isPending}
                  className="w-full mt-1 py-1.5 border border-dashed border-slate-300 text-slate-500 hover:text-green-600 hover:border-green-300 hover:bg-green-50 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Nouvelle évaluation (EP)
                </button>
              </div>
            </div>
                )})}
              </div>
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog {...confirmDialogProps} />
    </section>
  )
}