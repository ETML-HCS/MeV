export interface AcademicYear {
  start: number
  end: number
}

export interface Student {
  id: string
  firstname: string
  lastname: string
  login: string
  group: 'fin' | 'cin' | 'min' | string
  gridId: string
}

export interface Indicator {
  id: string
  taxonomy: string
  behavior: string
  weight: number
  conditions: string
  expectedResults: string
  remarks: Record<0 | 1 | 2 | 3, string>
  questionNumber?: number
}

export interface Objective {
  id: string
  number: number
  title: string
  description: string
  weight: number
  indicators: Indicator[]
}

// Template d'objectifs (squelette de module sans les questions)
export interface ObjectiveTemplate {
  id: string
  number: number
  title: string
  description: string
  weight: number
}

export interface ModuleTemplate {
  id: string
  name: string // Ex: "DEP-C216"
  description: string
  objectives: ObjectiveTemplate[]
  createdAt: Date
  updatedAt: Date
}

// Template de grille complète (objectifs + questions)
export interface EvaluationTemplate {
  id: string
  name: string // Ex: "C216 IoT - Grille complète"
  description: string
  objectives: Objective[] // Objectifs complets avec indicateurs/questions
  createdAt: Date
  updatedAt: Date
}

export interface Evaluation {
  objectiveId: string
  indicatorId: string
  score: 0 | 1 | 2 | 3 | null
  customRemark: string
  calculatedPoints: number
  selected: boolean // Pour les examens où l'élève choisit ses questions
}

export interface StudentGrid {
  studentId: string
  evaluations: Evaluation[]
  totalPoints: number
  maxPoints: number
  finalGrade: number
  moduleName: string
  moduleDescription: string
  testDate?: string // Date du test (format ISO YYYY-MM-DD) - optionnel pour rétrocompatibilité
  testDateOverride?: string // Date alternative si l'élève était absent (format ISO YYYY-MM-DD)
  generatedAt: Date
  completedAt: Date | null // Date de finalisation de l'évaluation
  correctedBy?: string // Nom du correcteur - optionnel pour rétrocompatibilité
}

export interface AppSettings {
  classAverage: number
  threshold: number
  correctionError: number
  moduleName: string
  testIdentifier: string
  testType: 'formatif' | 'sommatif'
  moduleDescription: string
  correctedBy: string
  showObjectives: boolean
  studentTabsLocked: boolean
  maxQuestionsToAnswer: number | null // null = toutes les questions, sinon nombre spécifique (ex: 13/16)
  testDate: string // Date du test (format ISO YYYY-MM-DD)
  schoolName: string // Nom de l'école pour le PDF (ex: "ETML / CFPV") - peut contenir du HTML simple
}

export interface AppState {
  academicYear: AcademicYear
  students: Student[]
  objectives: Objective[]
  grids: Map<string, StudentGrid>
  settings: AppSettings
}

export type AppTab =
  | 'dashboard'
  | 'students'
  | 'objectives'
  | 'master-grid'
  | 'evaluation'
  | 'synthesis'
  | 'projects'
  | 'templates'
  | 'evaluationTemplates'

export interface EvaluationProject {
  id: string
  name: string
  description: string
  createdAt: Date
  updatedAt: Date
  settings: AppSettings
  students: Student[]
  objectives: Objective[]
  grids: StudentGrid[]
  moduleNumber: string | null
  modulePrefix: 'I' | 'C' | null
  weightPercentage: number | null
}

export interface User {
  id: string
  name: string
  initials: string
  color: string
  createdAt: Date
  lastLogin: Date
}

export interface UserEvaluation {
  id: string
  userId: string
  projectId: string
  lastOpenedAt: Date
}

