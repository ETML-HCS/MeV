import { useMemo, useState } from 'react'
import { createSqlObjectiveTemplate } from '../../lib/sql-objective-template'
import { MAX_INDICATORS_PER_OBJECTIVE } from '../../utils/constants'
import { TAXONOMY_LEVELS } from '../../utils/taxonomy'
import { uid } from '../../utils/helpers'
import type { Indicator, Objective, StudentGrid } from '../../types'

interface ObjectivesViewProps {
  objectives: Objective[]
  grids: StudentGrid[]
  onSave: (objective: Objective) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onReorder: (objectives: Objective[]) => Promise<void>
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

export const ObjectivesView = ({ objectives, grids, onSave, onDelete, onReorder }: ObjectivesViewProps) => {
  const [title, setTitle] = useState('')
  const [showQuickImport, setShowQuickImport] = useState(false)
  const [quickImportText, setQuickImportText] = useState('')

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
    
    if (hasData) {
      const confirmed = window.confirm(
        `⚠️ ATTENTION : Suppression dangereuse !\n\n` +
        `L'objectif "${objective.title}" contient ${evalCount} évaluation(s) en cours.\n\n` +
        `Si vous supprimez cet objectif, TOUTES les données d'évaluation associées seront DÉFINITIVEMENT PERDUES.\n\n` +
        `Êtes-vous ABSOLUMENT SÛR de vouloir continuer ?`
      )
      
      if (!confirmed) return
    } else {
      const confirmed = window.confirm(
        `Supprimer l'objectif "${objective.title}" ?\n\nCette action est irréversible.`
      )
      
      if (!confirmed) return
    }
    
    await onDelete(objective.id)
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

  const loadSqlTemplate = async () => {
    let nextQuestionNumber = getNextQuestionNumber()
    const template = createSqlObjectiveTemplate(objectives.length + 1)
    await onSave({
      ...template,
      indicators: template.indicators.map((indicator) => ({
        ...indicator,
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

  const isWeightValid = (_weight: number) => true

  return (
    <section className="space-y-8">
      {/* HEADER ACTIONS */}
      <div className="flex flex-wrap items-end gap-4 pb-6 border-b border-slate-200">
        <div className="flex-1 min-w-80">
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Nouvel objectif d'évaluation
          </label>
          <div className="flex gap-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre de l'objectif..."
              className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
              onKeyDown={(e) => e.key === 'Enter' && addObjective()}
            />
            <button 
              onClick={addObjective}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center gap-2"
            >
              <span>+</span>
              Ajouter
            </button>
          </div>
        </div>
        
        <button 
          onClick={() => setShowQuickImport(!showQuickImport)}
          className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-all active:scale-95"
        >
          {showQuickImport ? '✕ Fermer' : '⚡ Import rapide'}
        </button>

        <button 
          onClick={loadSqlTemplate}
          className="px-5 py-3 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-xl transition-all active:scale-95"
        >
          Charger exemple SQL
        </button>
      </div>

      {/* QUICK IMPORT FORM */}
      {showQuickImport && (
        <div className="bg-gradient-to-br from-emerald-50 to-blue-50 rounded-2xl border border-emerald-200 p-6 shadow-sm">
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-bold text-slate-800 mb-2">Import rapide d'objectifs</h4>
              <div className="text-xs text-slate-600 space-y-1">
                <p className="font-semibold">Format avec séparateur | (pipe) :</p>
                <div className="bg-white rounded-lg p-3 font-mono text-[11px] border border-slate-200 space-y-1">
                  <div className="text-emerald-600 font-bold">O1 | Titre objectif | Description (optionnel)</div>
                  <div className="text-blue-600">Q1 | Taxonomie | Comportement | Conditions | Résultats | Poids | Critère 3pts | Critère 2pts | Critère 1pt | Critère 0pt</div>
                  <div className="text-slate-400 mt-2 text-[10px]">Les critères sont dans l'ordre décroissant : 3 pts (excellent) → 0 pt (insuffisant)</div>
                </div>
              </div>
            </div>
            <textarea
              value={quickImportText}
              onChange={(e) => setQuickImportText(e.target.value)}
              rows={12}
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-xs font-mono text-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none resize-none placeholder:text-slate-400 bg-white"
              placeholder="O1 | Protocoles sans fil | Communication IoT\nQ1 | Appliquer | Choix topologie réseau justifié | Critères techniques | 2 critères valides | 2 | Complet et précis | Bon choix | Choix partiel | Aucun choix\nQ2 | Appliquer | Choix protocole radio justifié | Critères techniques | 2 critères valides | 2 | Complet et précis | Bon choix | Choix partiel | Aucun choix"
            />
            <div className="flex justify-between items-start gap-4">
              <div className="text-xs text-slate-500 space-y-1">
                <p><strong>Séparateur :</strong> Pipe | (visible et copie-colle safe)</p>
                <p><strong>Colonnes obligatoires :</strong> O/Q + Titre/Comportement</p>
                <p><strong>Colonnes optionnelles :</strong> Vides = valeurs par défaut</p>
                <p><strong>Poids :</strong> 1 à 9 (défaut : 1)</p>
              </div>
              <button
                onClick={applyQuickImport}
                disabled={!quickImportText.trim()}
                className="px-6 py-2.5 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
              >
                Importer les objectifs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OBJECTIVES LIST */}
      <div className="space-y-6">
        {objectives.map((objective, index) => {
          const indicatorsWeight = objective.indicators.reduce((sum, indicator) => sum + indicator.weight, 0)
          const weightValid = isWeightValid(indicatorsWeight)
          const canAddQuestion = objective.indicators.length < MAX_INDICATORS_PER_OBJECTIVE
          
          return (
            <article 
              key={objective.id} 
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
            >
              {/* OBJECTIVE HEADER */}
              <div className="p-6 bg-slate-50/50 border-b border-slate-200">
                <div className="flex flex-wrap items-center gap-4 mb-4">
                  <span className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white font-bold rounded-lg shadow-md">
                    O{objective.number}
                  </span>
                  
                  <input
                    value={objective.title}
                    onChange={(e) => onSave({ ...objective, title: e.target.value })}
                    className="flex-1 min-w-64 text-lg font-bold text-slate-900 bg-transparent border-b-2 border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none px-2 py-1 transition-colors"
                    placeholder="Titre de l'objectif"
                  />
                  
                  <input
                    value={objective.description}
                    onChange={(e) => onSave({ ...objective, description: e.target.value })}
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
                      className="w-16 text-sm font-semibold text-center bg-transparent focus:outline-none"
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
                  className="ml-3 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:border-blue-400 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  + Ajouter une question
                </button>
              </div>

              {/* INDICATORS TABLE */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold border-b border-slate-200 w-20 sticky left-0 bg-slate-100 z-20">O/Q</th>
                      <th className="px-3 py-2 text-left font-semibold border-b border-slate-200 w-28">Taxonomie</th>
                      <th className="px-3 py-2 text-left font-semibold border-b border-slate-200 min-w-64">Comportement</th>
                      <th className="px-3 py-2 text-left font-semibold border-b border-slate-200 min-w-52">Conditions</th>
                      <th className="px-3 py-2 text-left font-semibold border-b border-slate-200 min-w-52">Résultats</th>
                      <th className="px-3 py-2 text-left font-semibold border-b border-slate-200 w-16">Poids</th>
                      <th className="px-3 py-2 text-left font-semibold border-b border-slate-200 w-44">Critères (3-2-1-0)</th>
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
                              className="w-14 rounded-md border border-slate-200 bg-white px-1 py-0.5 text-center text-[10px] font-semibold text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none"
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
                            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none bg-white"
                          >
                            {TAXONOMY_LEVELS.map((level) => (
                              <option key={level} value={level}>{level}</option>
                            ))}
                          </select>
                        </td>
                        
                        <td className="px-3 py-2 align-top">
                          <input
                            value={indicator.behavior}
                            onChange={(e) => onSave({
                              ...objective,
                              indicators: objective.indicators.map((entry) =>
                                entry.id === indicator.id ? { ...entry, behavior: e.target.value } : entry
                              ),
                            })}
                            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none"
                            placeholder="Comportement observable"
                          />
                        </td>
                        
                        <td className="px-3 py-2 align-top">
                          <textarea
                            value={indicator.conditions}
                            onChange={(e) => onSave({
                              ...objective,
                              indicators: objective.indicators.map((entry) =>
                                entry.id === indicator.id ? { ...entry, conditions: e.target.value } : entry
                              ),
                            })}
                            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none resize-y"
                            rows={4}
                            placeholder="Conditions..."
                          />
                        </td>
                        
                        <td className="px-3 py-2 align-top">
                          <textarea
                            value={indicator.expectedResults}
                            onChange={(e) => onSave({
                              ...objective,
                              indicators: objective.indicators.map((entry) =>
                                entry.id === indicator.id ? { ...entry, expectedResults: e.target.value } : entry
                              ),
                            })}
                            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none resize-y"
                            rows={4}
                            placeholder="Résultats attendus..."
                          />
                        </td>
                        
                        <td className="px-3 py-2 align-top">
                          <input
                            type="number"
                            step="1"
                            min={1}
                            max={9}
                            value={indicator.weight}
                            onChange={(e) => {
                              const parsed = Number(e.target.value)
                              const nextWeight = Number.isFinite(parsed) ? Math.max(1, Math.min(9, Math.round(parsed))) : 1
                              onSave({
                                ...objective,
                                indicators: objective.indicators.map((entry) =>
                                  entry.id === indicator.id ? { ...entry, weight: nextWeight } : entry
                                ),
                              })
                            }}
                            className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-center font-semibold focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none"
                          />
                        </td>
                        
                        <td className="px-3 py-2 align-top">
                          <div className="space-y-1.5">
                            {[3, 2, 1, 0].map((points) => (
                              <div key={points} className="flex gap-1.5">
                                <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-slate-100 rounded text-[10px] font-bold text-slate-600">
                                  {points}
                                </span>
                                <input
                                  value={indicator.remarks[points as keyof typeof indicator.remarks]}
                                  onChange={(e) => onSave({
                                    ...objective,
                                    indicators: objective.indicators.map((entry) =>
                                      entry.id === indicator.id
                                        ? { ...entry, remarks: { ...entry.remarks, [points]: e.target.value } }
                                        : entry
                                    ),
                                  })}
                                  className="flex-1 min-w-0 text-xs rounded border border-slate-200 px-2 py-0.5 focus:border-blue-500 focus:outline-none"
                                  placeholder={`${points}pt`}
                                />
                              </div>
                            ))}
                          </div>
                        </td>
                        
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
                  className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:border-blue-400 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  + Ajouter une question
                </button>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => duplicateObjective(objective)}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
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
      </div>
    </section>
  )
}