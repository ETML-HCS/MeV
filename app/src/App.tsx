import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DashboardView } from './components/dashboard/DashboardView'
import { BackupModal } from './components/dashboard/BackupModal'
import { EvaluationView } from './components/evaluation/EvaluationView'
import { AppLayout } from './components/layout/AppLayout'
import { LoginModal } from './components/layout/LoginModal'
import { EditProfileModal } from './components/layout/EditProfileModal'
import { ProfileBadge } from './components/layout/ProfileBadge'
import { MasterGridView } from './components/master-grid/MasterGridView'
import { ObjectivesView } from './components/objectives/ObjectivesView'
import { ProjectsListView } from './components/projects/ProjectsListView'
import { StudentsView } from './components/students/StudentsView'
import { SynthesisView } from './components/synthesis/SynthesisView'
import { TemplatesView } from './components/templates/TemplatesView'
import { EvaluationTemplatesView } from './components/evaluation-templates/EvaluationTemplatesView'
import { LabGroupGradesView } from './components/grades/LabGroupGradesView'
import { ModuleSummaryView } from './components/grades/ModuleSummaryView'
import { useEvaluation } from './hooks/useEvaluation'
import { useObjectives } from './hooks/useObjectives'
import { useStudents } from './hooks/useStudents'
import { calculateFinalGrade, calculateGridTotals } from './lib/calculations'
import { db, getProject, getProjects, getSettings, setSettings, updateProject, recordUserEvaluation, initDb } from './lib/db'
import { generateBatchZip } from './lib/pdf-generator'
import { useAppStore } from './stores/useAppStore'
import { useUserStore } from './stores/useUserStore'
import type { Student, Objective, AppTab } from './types'

function App() {
  const queryClient = useQueryClient()
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showEditProfileModal, setShowEditProfileModal] = useState(false)
  const [showBackupModal, setShowBackupModal] = useState(false)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [commandQuery, setCommandQuery] = useState('')
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0)
  const [moduleSummaryName, setModuleSummaryName] = useState<string | null>(null)
  const hydratedProjectIdRef = useRef<string | null>(null)
  const lastSavedSnapshotRef = useRef<string>('')
  
  const { activeTab, setActiveTab, activeProjectId, setActiveProjectId, selectedStudentId, setSelectedStudentId, settings, setSettings: setSettingsStore } =
    useAppStore()
  
  const { user, initializeUser } = useUserStore()

  const { students, replaceAll, saveStudent } = useStudents()
  const { objectives, upsert, remove, reorder, replaceAll: replaceAllObjectives } = useObjectives()
  const { grid, saveGrid, markAsCompleted, markAsIncomplete, updateTestDateOverride, saveStatus } = useEvaluation(selectedStudentId, objectives, settings.scoringMode)

  const gridsQuery = useQuery({
    queryKey: ['grids', activeProjectId],
    queryFn: () => db.grids.toArray(),
    enabled: !!activeProjectId,
  })

  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
  })

  const projectQuery = useQuery({
    queryKey: ['project', activeProjectId],
    queryFn: () => (activeProjectId ? getProject(activeProjectId) : Promise.resolve(null)),
    enabled: !!activeProjectId,
  })

  const allProjectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: getProjects,
    enabled: !!activeProjectId,
  })

  const settingsMutation = useMutation({
    mutationFn: setSettings,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  })

  const saveProjectMutation = useMutation({
    mutationFn: updateProject,
    onSuccess: () => {},
  })

  useEffect(() => {
    if (settingsQuery.data) {
      setSettingsStore(settingsQuery.data)
    }
  }, [settingsQuery.data, setSettingsStore])

  // Initialiser l'utilisateur au démarrage
  useEffect(() => {
    const init = async () => {
      await initDb()
      await initializeUser()
      // Afficher le modal si aucun utilisateur n'est connecté
      // On laisse cocher la case première utilisation dans le localStorage
      const hasSeenLoginModal = localStorage.getItem('hasSeenLoginModal')
      if (!hasSeenLoginModal) {
        setShowLoginModal(true)
        localStorage.setItem('hasSeenLoginModal', 'true')
      }
    }
    init()
  }, [initializeUser])

  // Auto-remplir le correcteur avec le trigramme de l'utilisateur connecté si vide
  useEffect(() => {
    if (user && !settings.correctedBy.trim()) {
      setSettingsStore({ ...settings, correctedBy: user.initials })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.initials, settings.correctedBy])

  // Quand on ouvre un projet, charger ses données dans la DB (une seule fois par ouverture)
  useEffect(() => {
    if (activeProjectId && projectQuery.data && hydratedProjectIdRef.current !== activeProjectId) {
      const project = projectQuery.data
      
      // Enregistrer l'ouverture du projet si l'utilisateur est connecté
      if (user) {
        recordUserEvaluation(user.id, activeProjectId).catch(console.error)
      }
      
      // Charger les données du projet dans la DB
      Promise.all([
        db.students.clear().then(() => db.students.bulkAdd(project.students)),
        db.objectives.clear().then(() => db.objectives.bulkAdd(project.objectives)),
        db.grids.clear().then(() => db.grids.bulkAdd(project.grids)),
      ]).then(() => {
        // Préserver les préférences de vue (elles sont globales, pas liées au projet)
        const mergedSettings = {
          ...project.settings,
          evaluationViewMode: settings.evaluationViewMode || 'objectives',
          objectivesViewMode: settings.objectivesViewMode || 'objectives',
        }
        return setSettings(mergedSettings)
      }).then(() => {
        const mergedSettings = {
          ...projectQuery.data!.settings,
          evaluationViewMode: settings.evaluationViewMode || 'objectives',
          objectivesViewMode: settings.objectivesViewMode || 'objectives',
        }
        setSettingsStore(mergedSettings)
        
        // Mettre à jour la référence de snapshot AVANT de déclencher les requêtes
        // pour éviter que le useEffect de sauvegarde ne se déclenche avec des données obsolètes
        lastSavedSnapshotRef.current = JSON.stringify({
          projectId: activeProjectId,
          students: project.students,
          objectives: project.objectives,
          settings: project.settings,
        })
        
        // Invalider les requêtes pour forcer le rechargement depuis la DB locale
        return Promise.all([
          queryClient.invalidateQueries({ queryKey: ['students', activeProjectId] }),
          queryClient.invalidateQueries({ queryKey: ['objectives', activeProjectId] }),
          queryClient.invalidateQueries({ queryKey: ['grids', activeProjectId] }),
          queryClient.invalidateQueries({ queryKey: ['grid'] })
        ])
      }).then(() => {
        // Seulement après que les requêtes ont été invalidées et rechargées,
        // on marque le projet comme hydraté. Cela empêche le useEffect de sauvegarde
        // de s'exécuter avec les anciennes données du cache React Query.
        hydratedProjectIdRef.current = activeProjectId
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProjectId, projectQuery.data, user, queryClient, setSettingsStore])

  // Sauvegarder le projet quand les données changent
  useEffect(() => {
    if (activeProjectId && projectQuery.data) {
      // Ne pas sauvegarder si le projet n'est pas encore hydraté
      if (hydratedProjectIdRef.current !== activeProjectId) return
      
      const currentGrids = gridsQuery.data ?? []
      const snapshot = JSON.stringify({
        projectId: activeProjectId,
        students,
        objectives,
        settings,
        gridsHash: currentGrids.map(g => `${g.studentId}:${g.finalGrade}:${g.completedAt}`).join(','),
      })
      
      // Ne pas sauvegarder si les données n'ont pas changé
      if (snapshot === lastSavedSnapshotRef.current) return

      const timer = setTimeout(async () => {
        if (projectQuery.data && hydratedProjectIdRef.current === activeProjectId) {
          await saveProjectMutation.mutateAsync({
            id: projectQuery.data.id,
            name: projectQuery.data.name,
            description: projectQuery.data.description,
            createdAt: projectQuery.data.createdAt,
            updatedAt: new Date(),
            students,
            objectives,
            grids: await db.grids.toArray(),
            settings,
            moduleNumber: projectQuery.data.moduleNumber,
            modulePrefix: projectQuery.data.modulePrefix,
            weightPercentage: projectQuery.data.weightPercentage,
          })
          lastSavedSnapshotRef.current = snapshot
        }
      }, 1500)
      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students, objectives, settings, activeProjectId, gridsQuery.data])

  // Sauvegarde forcée du projet courant (sans debounce)
  const forceFlushProject = async (projectId: string) => {
    if (!projectId) return
    const project = projectQuery.data
    if (!project || hydratedProjectIdRef.current !== projectId) return
    try {
      const currentGrids = await db.grids.toArray()
      await saveProjectMutation.mutateAsync({
        id: project.id,
        name: project.name,
        description: project.description,
        createdAt: project.createdAt,
        updatedAt: new Date(),
        students,
        objectives,
        grids: currentGrids,
        settings,
        moduleNumber: project.moduleNumber,
        modulePrefix: project.modulePrefix,
        weightPercentage: project.weightPercentage,
      })
      console.log('✅ Projet sauvegardé avant changement de contexte')
    } catch (e) {
      console.error('❌ Erreur sauvegarde forcée :', e)
    }
  }

  const handleOpenProject = (projectId: string) => {
    // Sauvegarder le projet courant avant d'en ouvrir un autre
    if (activeProjectId && hydratedProjectIdRef.current === activeProjectId) {
      forceFlushProject(activeProjectId)
    }
    hydratedProjectIdRef.current = null
    lastSavedSnapshotRef.current = ''
    setActiveProjectId(projectId)
    setActiveTab('dashboard')
  }

  const handleReturnToProjects = async () => {
    // Sauvegarder le projet courant avant de revenir à la liste
    if (activeProjectId && hydratedProjectIdRef.current === activeProjectId) {
      await forceFlushProject(activeProjectId)
    }
    hydratedProjectIdRef.current = null
    lastSavedSnapshotRef.current = ''
    setActiveProjectId(null)
    setActiveTab('projects')
  }

  const evaluations = grid?.evaluations ?? []
  const grids = gridsQuery.data ?? []

  const hasTestInfo = Boolean(
    settings.moduleName.trim() && settings.testIdentifier.trim() && settings.correctedBy.trim(),
  )
  const hasStudents = students.length > 0
  const hasObjectives = objectives.length > 0
  const hasStudentSheets = grids.length > 0 && hasStudents && hasObjectives
  const requiredEvaluationsCount = objectives.reduce((sum, objective) => sum + objective.indicators.length, 0)
  const allStudentsEvaluated =
    hasStudents &&
    hasObjectives &&
    students.every((student) => {
      const grid = grids.find((entry) => entry.studentId === student.id)
      if (!grid) return false
      const filled = grid.evaluations.filter((evaluation) => evaluation.score !== null && evaluation.score !== undefined).length
      return filled >= requiredEvaluationsCount
    })

  const completedEvaluationsCount = grids.filter((grid) => {
    // Ignorer les grilles des élèves qui n'existent plus
    if (!students.some(s => s.id === grid.studentId)) return false;

    // Un élève est considéré comme évalué si sa grille a une date de complétion
    // OU si toutes ses évaluations requises sont remplies
    if (grid.completedAt) return true;
    
    const filled = grid.evaluations.filter((evaluation) => evaluation.score !== null && evaluation.score !== undefined).length;
    return filled >= requiredEvaluationsCount && requiredEvaluationsCount > 0;
  }).length
  const totalEvaluationsCount = students.length

  const tabAccess = useMemo(() => ({
    dashboard: true,
    students: hasTestInfo || hasStudents,
    objectives: hasStudents || hasObjectives,
    'master-grid': hasObjectives,
    evaluation: hasStudents && hasObjectives,
    synthesis: hasStudentSheets,
    projects: true,
    templates: true,
    evaluationTemplates: true,
    groupGrades: true,
    moduleSummary: true,
  }), [hasTestInfo, hasStudents, hasObjectives, hasStudentSheets])

  type CommandItem = {
    id: string
    label: string
    hint: string
    action: () => void
  }

  const commandItems = useMemo<CommandItem[]>(() => {
    if (!activeProjectId) {
      return [
        { id: 'projects', label: 'Projets', hint: 'P', action: () => setActiveTab('projects') },
        { id: 'templates', label: 'Squelettes modules', hint: 'T', action: () => setActiveTab('templates') },
        { id: 'evaluationTemplates', label: 'Templates grilles', hint: 'G', action: () => setActiveTab('evaluationTemplates') },
        { id: 'groupGrades', label: 'Notes groupes labo', hint: 'N', action: () => setActiveTab('groupGrades') },
      ]
    }

    return [
      { id: 'dashboard', label: 'Dashboard', hint: 'D', action: () => setActiveTab('dashboard') },
      { id: 'students', label: 'Élèves', hint: 'S', action: () => setActiveTab('students') },
      { id: 'objectives', label: 'Objectifs', hint: 'O', action: () => setActiveTab('objectives') },
      { id: 'master-grid', label: 'Grille master', hint: 'M', action: () => setActiveTab('master-grid') },
      { id: 'evaluation', label: 'Évaluation', hint: 'E', action: () => setActiveTab('evaluation') },
      { id: 'synthesis', label: 'Synthèse', hint: 'Y', action: () => setActiveTab('synthesis') },
      { id: 'return-projects', label: 'Retour aux projets', hint: 'P', action: () => { void handleReturnToProjects() } },
    ].filter((item) => {
      if (item.id === 'return-projects') return true
      return tabAccess[item.id as keyof typeof tabAccess]
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProjectId, setActiveTab, tabAccess])

  const filteredCommandItems = useMemo(() => {
    const normalized = commandQuery.trim().toLowerCase()
    if (!normalized) return commandItems
    return commandItems.filter((item) => `${item.label} ${item.hint}`.toLowerCase().includes(normalized))
  }, [commandItems, commandQuery])

  const openCommandPalette = () => {
    setCommandQuery('')
    setSelectedCommandIndex(0)
    setIsCommandPaletteOpen(true)
  }

  const closeCommandPalette = () => {
    setIsCommandPaletteOpen(false)
    setCommandQuery('')
    setSelectedCommandIndex(0)
  }

  const runSelectedCommand = (command?: CommandItem) => {
    const selected = command ?? filteredCommandItems[selectedCommandIndex] ?? filteredCommandItems[0]
    if (!selected) return
    selected.action()
    closeCommandPalette()
  }

  useEffect(() => {
    const isTextInput = (target: EventTarget | null) => {
      const element = target as HTMLElement | null
      if (!element) return false
      return ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName) || element.isContentEditable
    }

    const handler = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()

      if (isCommandPaletteOpen) {
        if (key === 'escape') {
          event.preventDefault()
          closeCommandPalette()
          return
        }
        if (event.key === 'ArrowDown') {
          event.preventDefault()
          setSelectedCommandIndex((prev) => Math.min(prev + 1, Math.max(0, filteredCommandItems.length - 1)))
          return
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault()
          setSelectedCommandIndex((prev) => Math.max(prev - 1, 0))
          return
        }
        if (event.key === 'Enter') {
          event.preventDefault()
          runSelectedCommand()
          return
        }
      }

      if ((event.ctrlKey || event.metaKey) && key === 's') {
        event.preventDefault()
        if (activeProjectId) {
          forceFlushProject(activeProjectId)
        }
        return
      }

      if ((event.ctrlKey || event.metaKey) && key === 'k') {
        event.preventDefault()
        openCommandPalette()
        return
      }

      if ((event.ctrlKey || event.metaKey) && key === 'f') {
        event.preventDefault()
        const searchInput = document.querySelector<HTMLInputElement>('[data-shortcut-search="true"]')
        if (searchInput) {
          searchInput.focus()
          searchInput.select()
        }
        return
      }

      if (isTextInput(event.target)) return

      if (activeProjectId && event.altKey && !event.ctrlKey && !event.metaKey) {
        const order: AppTab[] = ['dashboard', 'students', 'objectives', 'master-grid', 'evaluation', 'synthesis']
        const currentIndex = order.indexOf(activeTab as AppTab)
        if (currentIndex === -1) return

        if (event.key === 'ArrowRight') {
          event.preventDefault()
          for (let i = currentIndex + 1; i < order.length; i++) {
            const candidate = order[i]
            if (tabAccess[candidate]) {
              setActiveTab(candidate)
              break
            }
          }
          return
        }

        if (event.key === 'ArrowLeft') {
          event.preventDefault()
          for (let i = currentIndex - 1; i >= 0; i--) {
            const candidate = order[i]
            if (tabAccess[candidate]) {
              setActiveTab(candidate)
              break
            }
          }
        }
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProjectId, activeTab, tabAccess, setActiveTab, isCommandPaletteOpen, filteredCommandItems, selectedCommandIndex])

  useEffect(() => {
    if (!isCommandPaletteOpen) return
    setSelectedCommandIndex(0)
  }, [commandQuery, isCommandPaletteOpen])

  const commandPalette = isCommandPaletteOpen ? (
    <div className="fixed inset-0 z-110 bg-black/40 flex items-start justify-center pt-[12vh] p-4" onClick={closeCommandPalette}>
      <div className="w-full max-w-2xl bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <input
            autoFocus
            value={commandQuery}
            onChange={(e) => setCommandQuery(e.target.value)}
            placeholder="Aller à..."
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
          />
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {filteredCommandItems.length === 0 ? (
            <div className="px-3 py-8 text-sm text-slate-400 text-center">Aucun résultat</div>
          ) : (
            filteredCommandItems.map((item, index) => (
              <button
                key={item.id}
                onClick={() => runSelectedCommand(item)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                  index === selectedCommandIndex
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="text-sm font-medium">{item.label}</span>
                <span className="text-[11px] px-2 py-0.5 rounded border border-slate-200 bg-white text-slate-500">{item.hint}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  ) : null

  const persistSettings = (next: typeof settings) => {
    setSettingsStore(next)
    settingsMutation.mutate(next)
  }

  useEffect(() => {
    const grids = gridsQuery.data ?? []
    if (grids.length === 0 || objectives.length === 0) return

    let cancelled = false

    const recalcGrades = async () => {
      const updates = []

      for (const grid of grids) {
        const totals = calculateGridTotals(objectives, grid.evaluations, settings.scoringMode)
        const nextFinalGrade = calculateFinalGrade(
          totals.totalPoints,
          totals.maxPoints,
          settings.threshold,
          settings.correctionError,
        )

        if (
          grid.finalGrade !== nextFinalGrade ||
          grid.totalPoints !== totals.totalPoints ||
          grid.maxPoints !== totals.maxPoints
        ) {
          updates.push({
            ...grid,
            totalPoints: totals.totalPoints,
            maxPoints: totals.maxPoints,
            finalGrade: nextFinalGrade,
          })
        }
      }

      if (updates.length > 0 && !cancelled) {
        await db.grids.bulkPut(updates)
        queryClient.invalidateQueries({ queryKey: ['grids'] })
        queryClient.invalidateQueries({ queryKey: ['grid'] })
      }
    }

    recalcGrades()

    return () => {
      cancelled = true
    }
  }, [gridsQuery.data, objectives, settings.threshold, settings.correctionError, settings.scoringMode, queryClient])

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const exportPdfBatch = async () => {
    const result = await generateBatchZip(
      students,
      gridsQuery.data ?? [],
      objectives,
      settings.testIdentifier,
      settings.moduleName,
      settings.correctedBy,
      settings.testDate,
      settings.schoolName
    )
    downloadBlob(result.blob, result.fileName)
  }

  const exportWebJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      settings,
      students,
      objectives,
      grids,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' })
    downloadBlob(blob, 'evaluation-web-export.json')
  }

  // Mode templates : afficher les squelettes de modules
  if (!activeProjectId && activeTab === 'templates') {
    return (
      <div className="min-h-screen bg-slate-100">
        <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
        <EditProfileModal isOpen={showEditProfileModal} onClose={() => setShowEditProfileModal(false)} />
        <div className="max-w-7xl mx-auto p-6 lg:p-8">
          <div className="flex justify-end mb-6">
            <ProfileBadge onLoginClick={() => setShowLoginModal(true)} onEditClick={() => setShowEditProfileModal(true)} />
          </div>
          <TemplatesView onBack={() => setActiveTab('projects')} />
        </div>
        {commandPalette}
      </div>
    )
  }

  // Mode evaluationTemplates : afficher les templates de grilles complètes
  if (!activeProjectId && activeTab === 'evaluationTemplates') {
    return (
      <div className="min-h-screen bg-slate-100">
        <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
        <EditProfileModal isOpen={showEditProfileModal} onClose={() => setShowEditProfileModal(false)} />
        <div className="max-w-7xl mx-auto p-6 lg:p-8">
          <div className="flex justify-end mb-6">
            <ProfileBadge onLoginClick={() => setShowLoginModal(true)} onEditClick={() => setShowEditProfileModal(true)} />
          </div>
          <EvaluationTemplatesView onBack={() => setActiveTab('projects')} />
        </div>
        {commandPalette}
      </div>
    )
  }

  // Mode groupGrades : afficher les notes par groupes labo
  if (!activeProjectId && activeTab === 'groupGrades') {
    return (
      <div className="min-h-screen bg-slate-100">
        <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
        <EditProfileModal isOpen={showEditProfileModal} onClose={() => setShowEditProfileModal(false)} />
        <div className="max-w-7xl mx-auto p-6 lg:p-8">
          <div className="flex justify-end mb-6">
            <ProfileBadge onLoginClick={() => setShowLoginModal(true)} onEditClick={() => setShowEditProfileModal(true)} />
          </div>
          <LabGroupGradesView onBack={() => setActiveTab('projects')} />
        </div>
        {commandPalette}
      </div>
    )
  }

  // Mode moduleSummary : synthèse par module (EP)
  if (!activeProjectId && activeTab === 'moduleSummary') {
    return (
      <div className="min-h-screen bg-slate-100">
        <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
        <EditProfileModal isOpen={showEditProfileModal} onClose={() => setShowEditProfileModal(false)} />
        <div className="max-w-7xl mx-auto p-6 lg:p-8">
          <div className="flex justify-end mb-6">
            <ProfileBadge onLoginClick={() => setShowLoginModal(true)} onEditClick={() => setShowEditProfileModal(true)} />
          </div>
          <ModuleSummaryView moduleName={moduleSummaryName ?? ''} onBack={() => setActiveTab('projects')} />
        </div>
        {commandPalette}
      </div>
    )
  }

  // Mode projects : afficher la liste
  if (!activeProjectId) {
    return (
      <div className="min-h-screen bg-slate-100 relative">
        <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
        <EditProfileModal isOpen={showEditProfileModal} onClose={() => setShowEditProfileModal(false)} />
        <div className="max-w-7xl mx-auto p-6 lg:p-8">
          <div className="flex justify-end mb-6">
            <ProfileBadge onLoginClick={() => setShowLoginModal(true)} onEditClick={() => setShowEditProfileModal(true)} />
          </div>
          <ProjectsListView 
            onSelectProject={handleOpenProject} 
            onOpenTemplates={() => setActiveTab('templates')}
            onOpenEvaluationTemplates={() => setActiveTab('evaluationTemplates')}
            onOpenGroupGrades={() => setActiveTab('groupGrades')}
            onOpenModuleSummary={(name) => { setModuleSummaryName(name); setActiveTab('moduleSummary') }}
          />
        </div>
        <div className="fixed bottom-3 right-4 text-[10px] font-medium text-slate-400/60 pointer-events-none select-none">
          v{__APP_VERSION__}
        </div>
        {commandPalette}
      </div>
    )
  }

  const currentProject = projectQuery.data
  const allProjects = allProjectsQuery.data ?? []
  const moduleProjects = currentProject 
    ? allProjects.filter(p => p.name === currentProject.name).sort((a, b) => {
        const epA = parseInt(a.settings.testIdentifier?.replace(/\D/g, '') || '0')
        const epB = parseInt(b.settings.testIdentifier?.replace(/\D/g, '') || '0')
        return epA - epB
      })
    : []

  // Mode workflow : afficher le layout avec workflow
  return (
    <>
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
      <EditProfileModal isOpen={showEditProfileModal} onClose={() => setShowEditProfileModal(false)} />
      <BackupModal isOpen={showBackupModal} onClose={() => setShowBackupModal(false)} />
      <AppLayout
        activeTab={activeTab === 'projects' ? 'dashboard' : activeTab}
        testType={settings.testType}
        onTabChange={setActiveTab}
        evaluationProgress={{
          completed: completedEvaluationsCount,
          total: totalEvaluationsCount,
        }}
        tabAccess={tabAccess}
        onReturnToProjects={handleReturnToProjects}
        exportSection={{
          visible: allStudentsEvaluated,
          onExportPdf: exportPdfBatch,
          onExportWebJson: exportWebJson,
        }}
        profileBadge={
          activeTab === 'evaluation' 
            ? <ProfileBadge onLoginClick={() => setShowLoginModal(true)} onEditClick={() => setShowEditProfileModal(true)} saveStatus={saveStatus} />
            : <ProfileBadge onLoginClick={() => setShowLoginModal(true)} onEditClick={() => setShowEditProfileModal(true)} />
        }
        onOpenPseudo={() => setActiveTab('students')}
        onOpenMasterGrid={() => setActiveTab('master-grid')}
        onOpenBackup={() => setShowBackupModal(true)}
        canOpenPseudo={tabAccess?.['students'] ?? true}
        canOpenMasterGrid={tabAccess?.['master-grid'] ?? true}
        moduleProjects={moduleProjects}
        activeProjectId={activeProjectId}
        onSelectProject={handleOpenProject}
      >
      {activeTab === 'dashboard' && (
        <DashboardView
          students={students}
          objectives={objectives}
          grids={grids}
          settings={settings}
          onUpdateSettings={persistSettings}
          onApplyTemplate={async (templateObjectives) => {
            await replaceAllObjectives.mutateAsync(templateObjectives)
          }}
          onCreateStudents={async (studentList) => {
            // Créer uniquement les nouveaux élèves (sans remplacer les existants)
            for (const entry of studentList) {
              const student: Student = {
                id: crypto.randomUUID(),
                lastname: entry.lastname,
                firstname: entry.firstname,
                login: '',
                group: '',
                gridId: '',
              }
              await saveStudent.mutateAsync(student)
            }
          }}
          testType={settings.testType}
        />
      )}

      {activeTab === 'students' && (
        <StudentsView
          students={students}
          onReplaceAll={async (list) => {
            await replaceAll.mutateAsync(list)
          }}
          onUpdateStudent={async (student) => {
            await saveStudent.mutateAsync(student)
          }}
        />
      )}

      {activeTab === 'objectives' && (
        <ObjectivesView
          project={projectQuery.data}
          objectives={objectives}
          grids={grids}
          viewMode={settings.objectivesViewMode || 'objectives'}
          onChangeViewMode={(mode) => persistSettings({ ...settings, objectivesViewMode: mode })}
          scoringMode={settings.scoringMode}
          onSave={async (objective) => {
            const isPoints = settings.scoringMode === 'points'
            await upsert.mutateAsync({
              ...objective,
              weight: isPoints ? Math.max(1, objective.weight) : Math.max(1, Math.round(objective.weight)),
              indicators: objective.indicators.map((indicator) => ({
                ...indicator,
                weight: isPoints ? Math.max(0.5, indicator.weight) : Math.max(1, Math.min(9, Math.round(indicator.weight))),
              })),
            })
          }}
          onDelete={async (id) => {
            await remove.mutateAsync(id)
          }}
          onReorder={async (list) => {
            await reorder.mutateAsync(list)
          }}
        />
      )}

      {activeTab === 'master-grid' && (
        <MasterGridView
          objectives={objectives}
          settings={settings}
          onImportFromTemplate={async (objectivesFromTemplate) => {
            // Créer les objectifs sans indicateurs à partir du template
            for (const objTemplate of objectivesFromTemplate) {
              const newObjective: Objective = {
                id: crypto.randomUUID(),
                number: objTemplate.number,
                title: objTemplate.title,
                description: objTemplate.description,
                weight: objTemplate.weight,
                indicators: [], // Pas d'indicateurs, juste la structure
              }
              upsert.mutate(newObjective)
            }
          }}
        />
      )}

      {activeTab === 'evaluation' && (
        <EvaluationView
          students={students}
          objectives={objectives}
          selectedStudentId={selectedStudentId}
          onSelectStudent={setSelectedStudentId}
          initialEvaluations={evaluations}
          threshold={settings.threshold}
          correctionError={settings.correctionError}
          showObjectives={settings.showObjectives}
          readOnly={settings.studentTabsLocked}
          maxQuestionsToAnswer={settings.maxQuestionsToAnswer}
          currentGrid={grid}
          grids={grids}
          viewMode={settings.evaluationViewMode || 'objectives'}
          onChangeViewMode={(mode) => persistSettings({ ...settings, evaluationViewMode: mode })}
          onSave={(nextEvaluations) => {
            saveGrid.mutate(nextEvaluations)
          }}
          onMarkAsCompleted={() => markAsCompleted.mutate()}
          onMarkAsIncomplete={() => markAsIncomplete.mutate()}
          onUpdateTestDateOverride={(date) => updateTestDateOverride.mutate(date)}
          scoringMode={settings.scoringMode}
        />
      )}

      {activeTab === 'synthesis' && (
        <SynthesisView 
          objectives={objectives} 
          students={students} 
          grids={grids} 
          testDate={settings.testDate}
          testIdentifier={settings.testIdentifier}
          moduleName={settings.moduleName}
          correctedBy={settings.correctedBy}
          schoolName={settings.schoolName}
          scoringMode={settings.scoringMode}
        />
      )}

      {activeTab === 'templates' && (
        <TemplatesView />
      )}
    </AppLayout>
    {commandPalette}
    </>
  )
}

export default App
