import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DashboardView } from './components/dashboard/DashboardView'
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
import { useEvaluation } from './hooks/useEvaluation'
import { useObjectives } from './hooks/useObjectives'
import { useStudents } from './hooks/useStudents'
import { calculateFinalGrade, calculateGridTotals } from './lib/calculations'
import { db, getProject, getSettings, setSettings, updateProject, recordUserEvaluation } from './lib/db'
import { generateBatchZip } from './lib/pdf-generator'
import { useAppStore } from './stores/useAppStore'
import { useUserStore } from './stores/useUserStore'
import type { Student, Objective } from './types'

function App() {
  const queryClient = useQueryClient()
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showEditProfileModal, setShowEditProfileModal] = useState(false)
  const hydratedProjectIdRef = useRef<string | null>(null)
  const lastSavedSnapshotRef = useRef<string>('')
  
  const { activeTab, setActiveTab, activeProjectId, setActiveProjectId, selectedStudentId, setSelectedStudentId, settings, setSettings: setSettingsStore } =
    useAppStore()
  
  const { user, initializeUser } = useUserStore()

  const { students, replaceAll, saveStudent } = useStudents()
  const { objectives, upsert, remove, reorder } = useObjectives()
  const { grid, saveGrid, markAsCompleted, markAsIncomplete, updateTestDateOverride, saveStatus } = useEvaluation(selectedStudentId, objectives)

  const gridsQuery = useQuery({
    queryKey: ['grids'],
    queryFn: () => db.grids.toArray(),
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
  }, [user?.initials, settings, settings.correctedBy, setSettingsStore])

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
      ]).then(() => setSettings(project.settings)).then(() => {
        setSettingsStore(project.settings)
        hydratedProjectIdRef.current = activeProjectId
        lastSavedSnapshotRef.current = JSON.stringify({
          projectId: activeProjectId,
          students: project.students,
          objectives: project.objectives,
          settings: project.settings,
        })
        queryClient.invalidateQueries({ queryKey: ['students'] })
        queryClient.invalidateQueries({ queryKey: ['objectives'] })
        queryClient.invalidateQueries({ queryKey: ['grids'] })
        queryClient.invalidateQueries({ queryKey: ['grid'] })
      })
    }
  }, [activeProjectId, projectQuery.data, user])

  // Sauvegarder le projet quand les données changent
  useEffect(() => {
    if (activeProjectId && projectQuery.data) {
      if (hydratedProjectIdRef.current !== activeProjectId) return
      const snapshot = JSON.stringify({
        projectId: activeProjectId,
        students,
        objectives,
        settings,
      })
      if (snapshot === lastSavedSnapshotRef.current) return

      const timer = setTimeout(async () => {
        if (projectQuery.data) {
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
  }, [students, objectives, settings, activeProjectId])

  const handleOpenProject = (projectId: string) => {
    hydratedProjectIdRef.current = null
    lastSavedSnapshotRef.current = ''
    setActiveProjectId(projectId)
    setActiveTab('dashboard')
  }

  const handleReturnToProjects = () => {
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

  const completedEvaluationsCount = grids.filter((grid) => !!grid.completedAt).length
  const totalEvaluationsCount = students.length

  const tabAccess = {
    dashboard: true,
    students: hasTestInfo || hasStudents,
    objectives: hasStudents || hasObjectives,
    'master-grid': hasObjectives,
    evaluation: hasStudents && hasObjectives,
    synthesis: hasStudentSheets,
    projects: true,
    templates: true,
  }

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
        const totals = calculateGridTotals(objectives, grid.evaluations)
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
  }, [gridsQuery.data, objectives, settings.threshold, settings.correctionError, queryClient])

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
      </div>
    )
  }

  // Mode projects : afficher la liste
  if (!activeProjectId) {
    return (
      <div className="min-h-screen bg-slate-100">
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
          />
        </div>
      </div>
    )
  }

  // Mode workflow : afficher le layout avec workflow
  return (
    <>
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
      <EditProfileModal isOpen={showEditProfileModal} onClose={() => setShowEditProfileModal(false)} />
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
        canOpenPseudo={tabAccess?.['students'] ?? true}
        canOpenMasterGrid={tabAccess?.['master-grid'] ?? true}
      >
      {activeTab === 'dashboard' && (
        <DashboardView
          students={students}
          objectives={objectives}
          grids={grids}
          settings={settings}
          onUpdateSettings={persistSettings}
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
          objectives={objectives}
          grids={grids}
          onSave={async (objective) => {
            await upsert.mutateAsync({
              ...objective,
              weight: Math.max(1, Math.round(objective.weight)),
              indicators: objective.indicators.map((indicator) => ({
                ...indicator,
                weight: Math.max(1, Math.min(9, Math.round(indicator.weight))),
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
          onSave={(nextEvaluations) => {
            saveGrid.mutate(nextEvaluations)
          }}
          onMarkAsCompleted={() => markAsCompleted.mutate()}
          onMarkAsIncomplete={() => markAsIncomplete.mutate()}
          onUpdateTestDateOverride={(date) => updateTestDateOverride.mutate(date)}
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
        />
      )}

      {activeTab === 'templates' && (
        <TemplatesView />
      )}
    </AppLayout>
    </>
  )
}

export default App
