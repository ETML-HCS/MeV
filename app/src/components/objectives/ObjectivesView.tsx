import { useCallback, useMemo, useRef, useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { db } from '../../lib/db'
import { MAX_INDICATORS_PER_OBJECTIVE } from '../../utils/constants'
import { TAXONOMY_LEVELS } from '../../utils/taxonomy'
import { uid } from '../../utils/helpers'
import { useConfirm } from '../../hooks/useConfirm'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import type { Indicator, Objective, StudentGrid, EvaluationProject, ModuleTemplate, EvaluationTemplate } from '../../types'

interface ObjectivesViewProps {
  project?: EvaluationProject | null
  objectives: Objective[]
  grids: StudentGrid[]
  viewMode: 'objectives' | 'questions'
  onChangeViewMode: (mode: 'objectives' | 'questions') => void
  onSave: (objective: Objective) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onReorder: (objectives: Objective[]) => Promise<void>
  scoringMode?: '0-3' | 'points'
}

const createIndicator = (questionNumber?: number): Indicator => ({
  id: uid(),
  taxonomy: 'Connaître',
  behavior: 'Nouveau comportement',
  weight: 1,
  conditions: '',
  expectedResults: '',
  remarks: {
    0: 'Insuffisant',
    1: 'Partiel',
    2: 'Satisfaisant',
    3: 'Excellent',
  },
  questionNumber,
})

export const ObjectivesView = ({ project, objectives, grids, viewMode, onChangeViewMode, onSave, onDelete, onReorder, scoringMode = '0-3' }: ObjectivesViewProps) => {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [showQuickImport, setShowQuickImport] = useState(false)
  const [quickImportText, setQuickImportText] = useState('')
  const [selectedSqueletteId, setSelectedSqueletteId] = useState<string>('')
  const [confirm, confirmDialogProps] = useConfirm()
  const debounceTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // --- Save as template ---
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')
  const [isSavingTemplate, setIsSavingTemplate] = useState(false)

  // --- Import from template ---
  const [showImportTemplate, setShowImportTemplate] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')

  const evalTemplatesQuery = useQuery({
    queryKey: ['evaluationTemplates'],
    queryFn: () => db.evaluationTemplates.orderBy('updatedAt').reverse().toArray(),
    enabled: showImportTemplate || showSaveTemplate,
  })

  const handleSaveAsTemplate = async () => {
    if (!templateName.trim() || objectives.length === 0) return
    setIsSavingTemplate(true)
    try {
      const template: EvaluationTemplate = {
        id: crypto.randomUUID(),
        name: templateName.trim(),
        description: templateDescription.trim(),
        objectives: objectives.map(obj => ({
          ...obj,
          id: crypto.randomUUID(),
          indicators: obj.indicators.map(ind => ({ ...ind, id: crypto.randomUUID() })),
        })),
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      await db.evaluationTemplates.add(template)
      queryClient.invalidateQueries({ queryKey: ['evaluationTemplates'] })
      setShowSaveTemplate(false)
      setTemplateName('')
      setTemplateDescription('')
    } finally {
      setIsSavingTemplate(false)
    }
  }

  const handleImportTemplate = async () => {
    if (!selectedTemplateId) return
    const templates = evalTemplatesQuery.data
    if (!templates) return
    const template = templates.find((t: EvaluationTemplate) => t.id === selectedTemplateId)
    if (!template) return

    const ok = await confirm({
      title: 'Importer un template',
      message: objectives.length > 0
        ? `Cette action ajoutera ${template.objectives.length} objectif(s) avec leurs questions aux ${objectives.length} objectif(s) existant(s). Continuer ?`
        : `Importer ${template.objectives.length} objectif(s) avec leurs questions depuis « ${template.name} » ?`,
      confirmLabel: 'Importer',
      variant: objectives.length > 0 ? 'warning' : 'default',
    })
    if (!ok) return

    let objectiveNumber = objectives.length + 1
    for (const obj of template.objectives) {
      await onSave({
        ...obj,
        id: uid(),
        number: objectiveNumber++,
        indicators: obj.indicators.map(ind => ({
          ...ind,
          id: uid(),
        })),
      })
    }
    setShowImportTemplate(false)
    setSelectedTemplateId('')
  }

  // Debounced save for text inputs (300ms)
  const debouncedSave = useCallback((objective: Objective) => {
    const key = objective.id
    const existing = debounceTimers.current.get(key)
    if (existing) clearTimeout(existing)
    debounceTimers.current.set(key, setTimeout(() => {
      onSave(objective)
      debounceTimers.current.delete(key)
    }, 300))
  }, [onSave])

  const squelettesQuery = useQuery({
    queryKey: ['moduleTemplates', project?.modulePrefix, project?.moduleNumber, project?.settings?.testIdentifier],
    queryFn: async () => {
      if (!project?.modulePrefix || !project?.moduleNumber) return []
      const allTemplates = await db.moduleTemplates.toArray()
      return allTemplates.filter(t => 
        t.modulePrefix === project.modulePrefix && 
        t.moduleNumber === project.moduleNumber && 
        t.testIdentifier === (project.settings?.testIdentifier || '')
      )
    },
    enabled: !!project && objectives.length === 0
  })

  const handleApplySquelette = async () => {
    if (!selectedSqueletteId || !squelettesQuery.data) return
    const template = squelettesQuery.data.find((t: ModuleTemplate) => t.id === selectedSqueletteId)
    if (!template) return

    for (const obj of template.objectives) {
      await onSave({
        id: crypto.randomUUID(),
        number: obj.number,
        title: obj.title,
        description: obj.description,
        weight: obj.weight,
        indicators: []
      })
    }
  }

  const fallbackQuestionNumberMap = useMemo(() => {
    const map = new Map<string, number>()
    let counter = 1
    objectives.forEach((objective) => {
      objective.indicators.forEach((indicator) => {
        if (!map.has(indicator.id)) {
          map.set(indicator.id, counter)
          counter += 1
        }
      })
    })
    return map
  }, [objectives])

  const getNextQuestionNumber = () => {
    const explicitNumbers = objectives
      .flatMap((objective) => objective.indicators.map((indicator) => indicator.questionNumber))
      .filter((value): value is number => Number.isFinite(value))

    if (explicitNumbers.length > 0) {
      return Math.max(...explicitNumbers) + 1
    }

    const totalQuestions = objectives.reduce((sum, objective) => sum + objective.indicators.length, 0)
    return totalQuestions + 1
  }

  // Vérifier si un objectif a des évaluations
  const hasEvaluations = (objectiveId: string): boolean => {
    return grids.some(grid => 
      grid.evaluations.some(evaluation => evaluation.objectiveId === objectiveId)
    )
  }

  // Compter les évaluations pour un objectif
  const countEvaluations = (objectiveId: string): number => {
    return grids.reduce((count, grid) => {
      const objEvals = grid.evaluations.filter(evaluation => evaluation.objectiveId === objectiveId)
      return count + objEvals.length
    }, 0)
  }

  const handleDeleteObjective = async (objective: Objective) => {
    const hasData = hasEvaluations(objective.id)
    const evalCount = countEvaluations(objective.id)
    
    let ok: boolean
    if (hasData) {
      ok = await confirm({
        title: 'Suppression dangereuse',
        message: `L'objectif "${objective.title}" contient ${evalCount} évaluation(s) en cours.\n\nSi vous supprimez cet objectif, TOUTES les données d'évaluation associées seront DÉFINITIVEMENT PERDUES.`,
        confirmLabel: 'Supprimer définitivement',
        variant: 'danger',
      })
    } else {
      ok = await confirm({
        title: 'Supprimer l\'objectif',
        message: `Supprimer l'objectif "${objective.title}" ?\n\nCette action est irréversible.`,
        confirmLabel: 'Supprimer',
        variant: 'warning',
      })
    }
    
    if (ok) await onDelete(objective.id)
  }

  const addObjective = async () => {
    const objective: Objective = {
      id: uid(),
      number: objectives.length + 1,
      title: title || `Objectif ${objectives.length + 1}`,
      description: '',
      weight: 1,
      indicators: [createIndicator(getNextQuestionNumber())],
    }
    await onSave(objective)
    setTitle('')
  }

  const duplicateObjective = async (objective: Objective) => {
    let nextQuestionNumber = getNextQuestionNumber()
    await onSave({
      ...objective,
      id: uid(),
      number: objectives.length + 1,
      title: `${objective.title} (copie)`,
      indicators: objective.indicators.map((indicator) => ({
        ...indicator,
        id: uid(),
        questionNumber: nextQuestionNumber++,
      })),
    })
  }

  const applyQuickImport = async () => {
    const lines = quickImportText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)

    const parsed: { objectiveTitle: string; objectiveDescription?: string; questions: Array<{
      questionNumber?: number
      taxonomy: string
      behavior: string
      conditions: string
      expectedResults: string
      weight: number
      remarks: { 0: string; 1: string; 2: string; 3: string }
    }> }[] = []
    let currentObjective: typeof parsed[0] | null = null

    for (const line of lines) {
      const parts = line.split('|').map((p) => p.trim())
      
      // Détecte O1, O2, etc.
      const objMatch = parts[0].match(/^O\d+$/)
      if (objMatch && parts.length >= 2) {
        // Nouveau objectif : O1 | Titre | Description (optionnel)
        if (currentObjective) {
          parsed.push(currentObjective)
        }
        currentObjective = {
          objectiveTitle: parts[1] || 'Objectif sans titre',
          objectiveDescription: parts[2] || '',
          questions: [],
        }
        continue
      }

      // Détecte Q1, Q2, etc.
      const qMatch = parts[0].match(/^Q(\d+)$/)
      if (qMatch && currentObjective && parts.length >= 2) {
        const questionNumber = Number.parseInt(qMatch[1], 10)
        // Format: Q1 | Taxonomie | Comportement | Conditions | Résultats | Poids | Critère3 | Critère2 | Critère1 | Critère0
        const taxonomy = parts[1] || 'Connaître'
        const behavior = parts[2] || 'Nouveau comportement'
        const conditions = parts[3] || ''
        const expectedResults = parts[4] || ''
        const weight = Math.max(1, Math.min(9, parseInt(parts[5]) || 1))
        
        // Les critères sont dans l'ordre 3, 2, 1, 0 (du meilleur au pire)
        currentObjective.questions.push({
          questionNumber: Number.isFinite(questionNumber) ? questionNumber : undefined,
          taxonomy,
          behavior,
          conditions,
          expectedResults,
          weight,
          remarks: {
            3: parts[6] || 'Excellent',
            2: parts[7] || 'Satisfaisant',
            1: parts[8] || 'Partiel',
            0: parts[9] || 'Insuffisant',
          },
        })
      }
    }

    // Ajouter le dernier objectif
    if (currentObjective) {
      parsed.push(currentObjective)
    }

    // Créer les objectifs et indicateurs
    let objectiveNumber = objectives.length + 1
    for (const item of parsed) {
      const newObjective: Objective = {
        id: uid(),
        number: objectiveNumber++,
        title: item.objectiveTitle,
        description: item.objectiveDescription || '',
        weight: 1,
        indicators: item.questions.map((q) => ({
          id: uid(),
          taxonomy: q.taxonomy,
          behavior: q.behavior,
          weight: q.weight,
          conditions: q.conditions,
          expectedResults: q.expectedResults,
          remarks: q.remarks,
          questionNumber: q.questionNumber,
        })),
      }
      await onSave(newObjective)
    }

    setQuickImportText('')
    setShowQuickImport(false)
  }

  // Global shortcuts
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return

      if (event.key.toLowerCase() === 'o' && event.ctrlKey) {
        event.preventDefault()
        onChangeViewMode('objectives')
        return
      }
      if (event.key.toLowerCase() === 'q' && event.ctrlKey) {
        event.preventDefault()
        onChangeViewMode('questions')
        return
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onChangeViewMode])

  const isPointsMode = scoringMode === 'points'

  return (
    <section className="space-y-8">
      {/* SQUELETTES DISPONIBLES */}
      {objectives.length === 0 && squelettesQuery.data && squelettesQuery.data.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-blue-900 mb-2">Squelettes disponibles pour ce module</h3>
          <p className="text-sm text-blue-700 mb-4">
            Nous avons trouvé des squelettes correspondant à votre module ({project?.modulePrefix}{project?.moduleNumber} - {project?.settings?.testIdentifier}). 
            Vous pouvez importer les objectifs automatiquement ou commencer de zéro.
          </p>
          <div className="flex items-center gap-4">
            <select
              value={selectedSqueletteId}
              onChange={(e) => setSelectedSqueletteId(e.target.value)}
              className="flex-1 max-w-md px-4 py-2.5 rounded-lg border border-blue-300 bg-white text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
            >
              <option value="">-- Choisir une version --</option>
              {squelettesQuery.data.map((t: ModuleTemplate) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.version ? `(Version ${t.version})` : ''}
                </option>
              ))}
            </select>
            <button
              onClick={handleApplySquelette}
              disabled={!selectedSqueletteId}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Importer le squelette
            </button>
          </div>
        </div>
      )}

      {/* HEADER ACTIONS */}
      <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-slate-200">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nouvel objectif..."
          className="flex-1 min-w-48 h-9 rounded-lg border border-slate-300 px-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
          onKeyDown={(e) => e.key === 'Enter' && addObjective()}
        />
        <button
          onClick={addObjective}
          title="Ajouter un objectif"
          className="h-9 w-9 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all active:scale-95 flex items-center justify-center"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
        <span className="w-px h-6 bg-slate-200" />
        <button
          onClick={() => setShowQuickImport(!showQuickImport)}
          className="h-9 px-3 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-lg transition-all active:scale-95 flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          {showQuickImport ? 'Fermer' : 'Import rapide'}
        </button>
        <button
          onClick={() => { setShowImportTemplate(!showImportTemplate); if (showSaveTemplate) setShowSaveTemplate(false) }}
          className="h-9 px-3 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-lg transition-all active:scale-95 flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {showImportTemplate ? 'Fermer' : 'Importer template'}
        </button>
        {objectives.length > 0 && (
          <button
            onClick={() => { setShowSaveTemplate(!showSaveTemplate); if (showImportTemplate) setShowImportTemplate(false) }}
            className="h-9 px-3 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-lg transition-all active:scale-95 flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            {showSaveTemplate ? 'Fermer' : 'Sauvegarder template'}
          </button>
        )}
        <div className="ml-auto">
          <button
            onClick={() => {
              const next = viewMode === 'objectives' ? 'questions' : 'objectives'
              onChangeViewMode(next)
            }}
            className="relative flex items-center w-16 h-9 rounded-lg border border-slate-300 bg-white shadow-sm overflow-hidden transition-all hover:border-blue-400 group"
            title={viewMode === 'objectives' ? 'Passer en vue Questions (Ctrl+Q)' : 'Passer en vue Objectifs (Ctrl+O)'}
          >
            <span className={`absolute inset-y-0 w-1/2 rounded-md m-0.5 transition-all duration-200 ${
              viewMode === 'objectives' ? 'left-0 bg-blue-600' : 'left-1/2 bg-blue-600'
            }`} />
            <span className={`relative z-10 flex-1 text-center text-xs font-bold transition-colors ${
              viewMode === 'objectives' ? 'text-white' : 'text-slate-500 group-hover:text-slate-700'
            }`}>O</span>
            <span className={`relative z-10 flex-1 text-center text-xs font-bold transition-colors ${
              viewMode === 'questions' ? 'text-white' : 'text-slate-500 group-hover:text-slate-700'
            }`}>Q</span>
          </button>
        </div>
      </div>

      {/* QUICK IMPORT FORM */}
      {showQuickImport && (
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4">
          <div className="space-y-3">
            <p className="text-[11px] text-slate-500 font-mono">
              <span className="text-emerald-700 font-semibold">O1 | Titre objectif</span>
              <span className="mx-2 text-slate-300">·</span>
              <span className="text-blue-700 font-semibold">Q1 | Taxonomie | Comportement | Conditions | Résultats | Poids | Critère 3pts | 2pts | 1pt | 0pt</span>
            </p>
            <textarea
              value={quickImportText}
              onChange={(e) => setQuickImportText(e.target.value)}
              rows={8}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-xs font-mono text-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none resize-none placeholder:text-slate-400 bg-white"
              placeholder="O1 | Protocoles sans fil\nQ1 | Appliquer | Choix topologie réseau | — | — | 2 | Complet et précis | Bon choix | Choix partiel | Aucun choix"
            />
            <div className="flex justify-end">
              <button
                onClick={applyQuickImport}
                disabled={!quickImportText.trim()}
                className="px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Importer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMPORT TEMPLATE PANEL */}
      {showImportTemplate && (
        <div className="bg-linear-to-br from-violet-50 to-blue-50 rounded-xl border border-violet-200 p-6 shadow-sm">
          <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Importer depuis un template existant
          </h4>
          <p className="text-xs text-slate-600 mb-4">
            Choisissez un template de grille complète pour importer ses objectifs <strong>avec toutes les questions et critères</strong>.
          </p>
          {evalTemplatesQuery.isLoading ? (
            <p className="text-sm text-slate-400">Chargement…</p>
          ) : !evalTemplatesQuery.data || evalTemplatesQuery.data.length === 0 ? (
            <p className="text-sm text-slate-500 italic">Aucun template disponible. Créez-en un depuis un projet existant avec « ^ Sauvegarder template ».</p>
          ) : (
            <div className="flex items-center gap-4">
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="flex-1 max-w-md px-4 py-2.5 rounded-lg border border-violet-300 bg-white text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none"
              >
                <option value="">-- Choisir un template --</option>
                {evalTemplatesQuery.data.map((t: EvaluationTemplate) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.objectives.length} obj., {t.objectives.reduce((s, o) => s + o.indicators.length, 0)} quest.)
                  </option>
                ))}
              </select>
              <button
                onClick={handleImportTemplate}
                disabled={!selectedTemplateId}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Importer le template
              </button>
            </div>
          )}
        </div>
      )}

      {/* SAVE AS TEMPLATE PANEL */}
      {showSaveTemplate && (
        <div className="bg-linear-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-6 shadow-sm">
          <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
            Sauvegarder comme template réutilisable
          </h4>
          <p className="text-xs text-slate-600 mb-4">
            Sauvegardez les <strong>{objectives.length} objectif(s)</strong> et <strong>{objectives.reduce((s, o) => s + o.indicators.length, 0)} question(s)</strong> actuels en tant que template. 
            Il sera disponible dans la page « Templates grilles » et importable dans tout projet.
          </p>
          <div className="flex flex-col gap-3 max-w-lg">
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Nom du template (ex: C216 IoT EP1 - Grille complète)"
              className="rounded-lg border border-amber-300 px-4 py-2.5 text-sm bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleSaveAsTemplate()}
            />
            <input
              type="text"
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
              placeholder="Description (optionnel)"
              className="rounded-lg border border-amber-300 px-4 py-2.5 text-sm bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
            />
            <button
              onClick={handleSaveAsTemplate}
              disabled={!templateName.trim() || isSavingTemplate}
              className="self-start px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSavingTemplate ? '...' : null}
              Sauvegarder
            </button>
          </div>
        </div>
      )}

      {/* QUESTIONS FLAT VIEW */}
      {viewMode === 'questions' && (
        <div className="space-y-3">
          {objectives.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-sm">Aucun objectif. Ajoutez-en un ci-dessus.</div>
          )}
          {objectives.flatMap((objective) =>
            objective.indicators.map((indicator, localIndex) => {
              const displayQuestionNumber = indicator.questionNumber
                ?? fallbackQuestionNumberMap.get(indicator.id)
                ?? localIndex + 1
              return (
                <article key={indicator.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      {/* Badge Q / O */}
                      <span className="shrink-0 w-10 h-10 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-md flex flex-col items-center justify-center mt-0.5 leading-tight">
                        <span>O{objective.number}.{localIndex + 1}</span>
                        <span className="text-[9px] text-slate-500">Q{displayQuestionNumber}</span>
                      </span>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-2">
                        {/* Objective selector */}
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={objective.id}
                            onChange={(e) => {
                              const targetObjectiveId = e.target.value
                              const targetObjective = objectives.find((o) => o.id === targetObjectiveId)
                              if (!targetObjective || targetObjective.id === objective.id) return
                              // Retirer l'indicateur de l'objectif source
                              const updatedSource = {
                                ...objective,
                                indicators: objective.indicators.filter((i) => i.id !== indicator.id),
                              }
                              onSave(updatedSource)
                              // Ajouter l'indicateur à l'objectif cible
                              const updatedTarget = {
                                ...targetObjective,
                                indicators: [...targetObjective.indicators, indicator],
                              }
                              onSave(updatedTarget)
                            }}
                            className="text-xs rounded-lg border border-slate-300 bg-slate-50 px-2 py-1 font-medium text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                          >
                            {objectives.map((o) => (
                              <option key={o.id} value={o.id}>O{o.number} · {o.title}</option>
                            ))}
                          </select>
                          <span className="text-[10px] text-slate-400">Taxonomie :</span>
                          <select
                            value={indicator.taxonomy}
                            onChange={(e) => onSave({
                              ...objective,
                              indicators: objective.indicators.map((entry) =>
                                entry.id === indicator.id ? { ...entry, taxonomy: e.target.value } : entry
                              ),
                            })}
                            className="text-xs rounded-lg border border-slate-300 bg-white px-2 py-1 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                          >
                            {TAXONOMY_LEVELS.map((level) => (
                              <option key={level} value={level}>{level}</option>
                            ))}
                          </select>
                          <span className="text-[10px] text-slate-400">{isPointsMode ? 'Pts Max :' : 'Poids :'}</span>
                          <input
                            type="number"
                            min={isPointsMode ? 0.5 : 1}
                            max={isPointsMode ? 100 : 9}
                            step={isPointsMode ? "0.5" : "1"}
                            value={indicator.weight}
                            onChange={(e) => {
                              const parsed = Number(e.target.value)
                              const next = Number.isFinite(parsed) ? (isPointsMode ? Math.max(0.5, parsed) : Math.max(1, Math.min(9, Math.round(parsed)))) : 1
                              onSave({
                                ...objective,
                                indicators: objective.indicators.map((entry) =>
                                  entry.id === indicator.id ? { ...entry, weight: next } : entry
                                ),
                              })
                            }}
                            className="w-12 text-xs text-center font-bold text-slate-900 rounded-lg border border-slate-300 bg-white px-1 py-1 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none no-spinners"
                          />
                        </div>

                        {/* Behavior */}
                        <input
                          value={indicator.behavior}
                          onChange={(e) => debouncedSave({
                            ...objective,
                            indicators: objective.indicators.map((entry) =>
                              entry.id === indicator.id ? { ...entry, behavior: e.target.value } : entry
                            ),
                          })}
                          className="w-full text-sm font-medium text-slate-800 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none px-1 py-0.5 transition-colors bg-transparent"
                          placeholder="Comportement observable"
                        />

                        {/* Conditions & Expected results */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">Conditions</span>
                            <textarea
                              value={indicator.conditions}
                              onChange={(e) => debouncedSave({
                                ...objective,
                                indicators: objective.indicators.map((entry) =>
                                  entry.id === indicator.id ? { ...entry, conditions: e.target.value } : entry
                                ),
                              })}
                              className="w-full text-xs rounded-lg border border-slate-300 px-2 py-1.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none resize-y mt-0.5"
                              rows={2}
                              placeholder="Conditions..."
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">Résultats attendus</span>
                            <textarea
                              value={indicator.expectedResults}
                              onChange={(e) => debouncedSave({
                                ...objective,
                                indicators: objective.indicators.map((entry) =>
                                  entry.id === indicator.id ? { ...entry, expectedResults: e.target.value } : entry
                                ),
                              })}
                              className="w-full text-xs rounded-lg border border-slate-300 px-2 py-1.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none resize-y mt-0.5"
                              rows={2}
                              placeholder="Résultats attendus..."
                            />
                          </div>
                        </div>

                        {/* Remarks */}
                        {!isPointsMode && (
                          <div className="flex items-center gap-1.5">
                            {[3, 2, 1, 0].map((pts) => (
                              <div key={pts} className="flex items-center gap-1">
                                <span className={`w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold ${
                                  pts === 3 ? 'bg-emerald-100 text-emerald-700' :
                                  pts === 2 ? 'bg-amber-100 text-amber-700' :
                                  pts === 1 ? 'bg-orange-100 text-orange-700' :
                                  'bg-red-100 text-red-700'
                                }`}>{pts}</span>
                                <input
                                  value={indicator.remarks[pts as 0|1|2|3]}
                                  onChange={(e) => debouncedSave({
                                    ...objective,
                                    indicators: objective.indicators.map((entry) =>
                                      entry.id === indicator.id
                                        ? { ...entry, remarks: { ...entry.remarks, [pts]: e.target.value } }
                                        : entry
                                    ),
                                  })}
                                  className="w-24 text-[11px] rounded-lg border border-slate-300 px-1.5 py-0.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                                  placeholder={`${pts}pt`}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Delete button */}
                      <button
                        onClick={() => {
                          if (objective.indicators.length <= 1) {
                            // Si c'est la dernière question, supprimer l'objectif entier
                            handleDeleteObjective(objective)
                          } else {
                            onSave({
                              ...objective,
                              indicators: objective.indicators.filter((i) => i.id !== indicator.id),
                            })
                          }
                        }}
                        className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors mt-0.5"
                        title="Supprimer cette question"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </article>
              )
            })
          )}
        </div>
      )}

      {/* OBJECTIVES LIST */}
      {viewMode === 'objectives' && <div className="space-y-6">
        {objectives.map((objective, index) => {
          const indicatorsWeight = objective.indicators.reduce((sum, indicator) => sum + indicator.weight, 0)
          const weightValid = indicatorsWeight === 100
          const canAddQuestion = objective.indicators.length < MAX_INDICATORS_PER_OBJECTIVE
          
          return (
            <article 
              key={objective.id} 
              className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
            >
              {/* OBJECTIVE HEADER */}
              <div className="p-6 bg-slate-50/50 border-b border-slate-200">
                <div className="flex flex-wrap items-center gap-4 mb-4">
                  <span className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white font-bold rounded-lg shadow-md">
                    O{objective.number}
                  </span>
                  
                  <input
                    value={objective.title}
                    onChange={(e) => debouncedSave({ ...objective, title: e.target.value })}
                    className="flex-1 min-w-64 text-lg font-bold text-slate-900 bg-transparent border-b-2 border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none px-2 py-1 transition-colors"
                    placeholder="Titre de l'objectif"
                  />
                  
                  <input
                    value={objective.description}
                    onChange={(e) => debouncedSave({ ...objective, description: e.target.value })}
                    className="w-80 text-sm text-slate-600 bg-white border border-slate-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                    placeholder="Description courte..."
                  />
                  
                  <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200">
                    <span className="text-xs font-medium text-slate-500">Poids</span>
                    <input
                      type="number"
                      step="1"
                      min={1}
                      value={objective.weight}
                      onChange={(e) => {
                        const parsed = Number(e.target.value)
                        const nextWeight = Number.isFinite(parsed) ? Math.max(1, Math.round(parsed)) : 1
                        onSave({ ...objective, weight: nextWeight })
                      }}
                      className="w-12 text-sm font-semibold text-center text-slate-800 bg-transparent focus:outline-none no-spinners"
                    />
                  </div>
                </div>

                {/* WEIGHT INDICATOR */}
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
                  weightValid 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${weightValid ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  {objective.indicators.length} question{objective.indicators.length > 1 ? 's' : ''} · Poids total : {indicatorsWeight}
                </div>

                <button
                  onClick={() => onSave({
                    ...objective,
                    indicators: [...objective.indicators, createIndicator(getNextQuestionNumber())],
                  })}
                  disabled={!canAddQuestion}
                  className="ml-3 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:border-blue-400 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  + Ajouter une question
                </button>
              </div>

              {/* INDICATORS TABLE */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold border-b border-slate-200 w-20 sticky left-0 bg-slate-50 z-20">O/Q</th>
                      <th className="px-3 py-2 text-left font-semibold border-b border-slate-200 w-28">Taxonomie</th>
                      <th className="px-3 py-2 text-left font-semibold border-b border-slate-200 min-w-64">Comportement</th>
                      <th className="px-3 py-2 text-left font-semibold border-b border-slate-200 min-w-52">Conditions</th>
                      <th className="px-3 py-2 text-left font-semibold border-b border-slate-200 min-w-52">Résultats</th>
                      <th className="px-3 py-2 text-left font-semibold border-b border-slate-200 w-16">{isPointsMode ? 'Pts Max' : 'Poids'}</th>
                      {!isPointsMode && <th className="px-3 py-2 text-left font-semibold border-b border-slate-200 w-44">Critères (3-2-1-0)</th>}
                      <th className="px-3 py-2 text-left font-semibold border-b border-slate-200 w-16">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {objective.indicators.map((indicator, questionIndex) => {
                      const displayQuestionNumber = indicator.questionNumber
                        ?? fallbackQuestionNumberMap.get(indicator.id)
                        ?? questionIndex + 1
                      return (
                      <tr key={indicator.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-3 py-2 align-top sticky left-0 bg-white hover:bg-slate-50/50 z-10">
                          <div className="flex flex-col items-center gap-1">
                            <span className="inline-flex flex-col items-center justify-center w-14 h-10 rounded-lg bg-slate-100 text-[10px] font-bold text-slate-700 leading-tight">
                              <span>O{objective.number}.{questionIndex + 1}</span>
                              <span className="text-[9px] text-slate-500">Q{displayQuestionNumber}</span>
                            </span>
                            <input
                              type="number"
                              min={1}
                              value={indicator.questionNumber ?? displayQuestionNumber}
                              onChange={(event) => {
                                const raw = event.target.value
                                const parsed = raw === '' ? undefined : Number.parseInt(raw, 10)
                                const nextValue = Number.isFinite(parsed) && (parsed ?? 0) > 0 ? parsed : undefined
                                onSave({
                                  ...objective,
                                  indicators: objective.indicators.map((entry) =>
                                    entry.id === indicator.id ? { ...entry, questionNumber: nextValue } : entry,
                                  ),
                                })
                              }}
                              className="w-14 rounded-lg border border-slate-300 bg-white px-1 py-0.5 text-center text-[10px] font-semibold text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none no-spinners"
                              title="Numero de question (Q)"
                            />
                          </div>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <select
                            value={indicator.taxonomy}
                            onChange={(e) => onSave({
                              ...objective,
                              indicators: objective.indicators.map((entry) =>
                                entry.id === indicator.id ? { ...entry, taxonomy: e.target.value } : entry
                              ),
                            })}
                            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white"
                          >
                            {TAXONOMY_LEVELS.map((level) => (
                              <option key={level} value={level}>{level}</option>
                            ))}
                          </select>
                        </td>
                        
                        <td className="px-3 py-2 align-top">
                          <input
                            value={indicator.behavior}
                            onChange={(e) => debouncedSave({
                              ...objective,
                              indicators: objective.indicators.map((entry) =>
                                entry.id === indicator.id ? { ...entry, behavior: e.target.value } : entry
                              ),
                            })}
                            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                            placeholder="Comportement observable"
                          />
                        </td>
                        
                        <td className="px-3 py-2 align-top">
                          <textarea
                            value={indicator.conditions}
                            onChange={(e) => debouncedSave({
                              ...objective,
                              indicators: objective.indicators.map((entry) =>
                                entry.id === indicator.id ? { ...entry, conditions: e.target.value } : entry
                              ),
                            })}
                            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none resize-y"
                            rows={4}
                            placeholder="Conditions..."
                          />
                        </td>
                        
                        <td className="px-3 py-2 align-top">
                          <textarea
                            value={indicator.expectedResults}
                            onChange={(e) => debouncedSave({
                              ...objective,
                              indicators: objective.indicators.map((entry) =>
                                entry.id === indicator.id ? { ...entry, expectedResults: e.target.value } : entry
                              ),
                            })}
                            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none resize-y"
                            rows={4}
                            placeholder="Résultats attendus..."
                          />
                        </td>
                        
                        <td className="px-3 py-2 align-top">
                          <input
                            type="number"
                            step={isPointsMode ? "0.5" : "1"}
                            min={isPointsMode ? 0.5 : 1}
                            max={isPointsMode ? 100 : 9}
                            value={indicator.weight}
                            onChange={(e) => {
                              const parsed = Number(e.target.value)
                              const nextWeight = Number.isFinite(parsed) ? (isPointsMode ? Math.max(0.5, parsed) : Math.max(1, Math.min(9, Math.round(parsed)))) : 1
                              onSave({
                                ...objective,
                                indicators: objective.indicators.map((entry) =>
                                  entry.id === indicator.id ? { ...entry, weight: nextWeight } : entry
                                ),
                              })
                            }}
                            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-center font-bold text-slate-900 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none no-spinners"
                          />
                        </td>
                        
                        {!isPointsMode && (
                          <td className="px-3 py-2 align-top">
                            <div className="space-y-1.5">
                              {[3, 2, 1, 0].map((points) => (
                                <div key={points} className="flex gap-1.5">
                                  <span className="shrink-0 w-5 h-5 flex items-center justify-center bg-slate-100 rounded text-[10px] font-bold text-slate-600">
                                    {points}
                                  </span>
                                  <input
                                    value={indicator.remarks[points as keyof typeof indicator.remarks]}
                                    onChange={(e) => debouncedSave({
                                      ...objective,
                                      indicators: objective.indicators.map((entry) =>
                                        entry.id === indicator.id
                                          ? { ...entry, remarks: { ...entry.remarks, [points]: e.target.value } }
                                          : entry
                                      ),
                                    })}
                                    className="flex-1 min-w-0 text-xs rounded-lg border border-slate-300 px-2 py-0.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                                    placeholder={`${points}pt`}
                                  />
                                </div>
                              ))}
                            </div>
                          </td>
                        )}
                        
                        <td className="px-3 py-2 align-top">
                          <button
                            onClick={() => onSave({
                              ...objective,
                              indicators: objective.indicators.filter((entry) => entry.id !== indicator.id),
                            })}
                            disabled={objective.indicators.length <= 1}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            title={objective.indicators.length <= 1 ? "Au moins une question est requise" : "Supprimer la question"}
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* FOOTER ACTIONS */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <button
                  onClick={() => onSave({
                    ...objective,
                    indicators: [...objective.indicators, createIndicator(getNextQuestionNumber())],
                  })}
                  disabled={objective.indicators.length >= MAX_INDICATORS_PER_OBJECTIVE}
                  className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:border-blue-400 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  + Ajouter une question
                </button>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => duplicateObjective(objective)}
                    className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    Dupliquer
                  </button>
                  
                  <div className="h-4 w-px bg-slate-300 mx-1" />
                  
                  <button
                    onClick={() => handleDeleteObjective(objective)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      hasEvaluations(objective.id)
                        ? 'text-red-700 bg-red-50 border border-red-300 hover:bg-red-100 font-semibold'
                        : 'text-red-600 hover:bg-red-50'
                    }`}
                    title={hasEvaluations(objective.id) 
                      ? `⚠️ Cet objectif contient ${countEvaluations(objective.id)} évaluation(s) !` 
                      : 'Supprimer cet objectif'}
                  >
                    {hasEvaluations(objective.id) && '⚠️ '}
                    Supprimer
                  </button>
                  
                  <div className="h-4 w-px bg-slate-300 mx-1" />
                  
                  <div className="flex gap-1">
                    <button
                      disabled={index === 0}
                      onClick={() => {
                        const clone = [...objectives]
                        ;[clone[index - 1], clone[index]] = [clone[index], clone[index - 1]]
                        onReorder(clone)
                      }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-300 text-slate-600 hover:border-slate-400 disabled:opacity-30 transition-colors"
                    >
                      ↑
                    </button>
                    <button
                      disabled={index === objectives.length - 1}
                      onClick={() => {
                        const clone = [...objectives]
                        ;[clone[index], clone[index + 1]] = [clone[index + 1], clone[index]]
                        onReorder(clone)
                      }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-300 text-slate-600 hover:border-slate-400 disabled:opacity-30 transition-colors"
                    >
                      ↓
                    </button>
                  </div>
                </div>
              </div>
            </article>
          )
        })}
      </div>}
      <ConfirmDialog {...confirmDialogProps} />
    </section>
  )
}