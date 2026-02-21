import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import JSZip from 'jszip'
import type {
  AppSettings,
  EvaluationProject,
  Objective,
  Student,
  StudentGrid,
  User,
  UserEvaluation,
} from '../src/types'
import { DEFAULT_THRESHOLD, DEFAULT_CORRECTION_ERROR } from '../src/utils/constants.js'
import { generateUserInitials } from '../src/utils/user-initials.js'

let db: Database.Database | null = null

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized')
  }
  return db
}

export async function initDatabase(): Promise<void> {
  const userDataPath = app.getPath('userData')
  const dbPath = path.join(userDataPath, 'mev-evaluation.sqlite')

  // S'assurer que le dossier existe
  fs.mkdirSync(userDataPath, { recursive: true })

  db = new Database(dbPath)
  db.pragma('journal_mode = WAL') // Write-Ahead Logging pour meilleures perfs

  // Créer les tables
  createTables()

  // Initialiser les settings par défaut si nécessaire
  initDefaultSettings()
}

function createTables(): void {
  const db = getDatabase()

  // Table settings
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `)

  // Table projects
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      moduleNumber TEXT,
      modulePrefix TEXT,
      weightPercentage REAL,
      settings TEXT NOT NULL,
      students TEXT NOT NULL,
      objectives TEXT NOT NULL,
      grids TEXT NOT NULL
    )
  `)

  // Index pour recherche rapide par module
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_projects_moduleNumber 
    ON projects(moduleNumber)
  `)

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_projects_createdAt 
    ON projects(createdAt DESC)
  `)

  // Table users
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      initials TEXT NOT NULL,
      color TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      lastLogin TEXT NOT NULL
    )
  `)

  // Table user_evaluations (tracking recent projects by user)
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_evaluations (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      projectId TEXT NOT NULL,
      lastOpenedAt TEXT NOT NULL,
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(projectId) REFERENCES projects(id) ON DELETE CASCADE,
      UNIQUE(userId, projectId)
    )
  `)

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_user_evaluations_userId 
    ON user_evaluations(userId)
  `)

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_user_evaluations_lastOpenedAt 
    ON user_evaluations(lastOpenedAt DESC)
  `)
}

function initDefaultSettings(): void {
  const db = getDatabase()

  const existing = db.prepare('SELECT * FROM settings WHERE key = ?').get('main')

  if (!existing) {
    const defaultSettings: AppSettings = {
      classAverage: 4,
      threshold: DEFAULT_THRESHOLD,
      correctionError: DEFAULT_CORRECTION_ERROR,
      moduleName: '',
      testIdentifier: '',
      testType: 'sommatif',
      moduleDescription: '',
      correctedBy: '',
      showObjectives: true,
      studentTabsLocked: false,
      maxQuestionsToAnswer: null,
      testDate: new Date().toISOString().split('T')[0],
      schoolName: '',
    }

    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run(
      'main',
      JSON.stringify(defaultSettings),
    )
  }
}

// Settings operations
export function getSettings(): AppSettings {
  const db = getDatabase()
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('main') as
    | { value: string }
    | undefined

  if (!row) {
    throw new Error('Settings not found')
  }

  // Merge avec les defaults pour garantir que les nouveaux champs sont présents
  // même sur d'anciens enregistrements DB
  const defaultSettings: AppSettings = {
    classAverage: 4,
    threshold: DEFAULT_THRESHOLD,
    correctionError: DEFAULT_CORRECTION_ERROR,
    moduleName: '',
    testIdentifier: '',
    testType: 'sommatif',
    moduleDescription: '',
    correctedBy: '',
    showObjectives: true,
    studentTabsLocked: false,
    maxQuestionsToAnswer: null,
    testDate: new Date().toISOString().split('T')[0],
    schoolName: '',
  }

  return { ...defaultSettings, ...JSON.parse(row.value) }
}

export function setSettings(settings: AppSettings): void {
  const db = getDatabase()
  db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(
    JSON.stringify(settings),
    'main',
  )
}

// Projects operations
export function getProjects(): EvaluationProject[] {
  const db = getDatabase()
  const rows = db
    .prepare('SELECT * FROM projects ORDER BY updatedAt DESC')
    .all() as Array<{
    id: string
    name: string
    description: string
    createdAt: string
    updatedAt: string
    moduleNumber: string | null
    modulePrefix: string | null
    weightPercentage: number | null
    settings: string
    students: string
    objectives: string
    grids: string
  }>

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    moduleNumber: row.moduleNumber,
    modulePrefix: row.modulePrefix as 'I' | 'C' | null,
    weightPercentage: row.weightPercentage,
    settings: JSON.parse(row.settings),
    students: JSON.parse(row.students),
    objectives: JSON.parse(row.objectives),
    grids: JSON.parse(row.grids),
  }))
}

export function getProject(id: string): EvaluationProject | null {
  const db = getDatabase()
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as
    | {
        id: string
        name: string
        description: string
        createdAt: string
        updatedAt: string
        moduleNumber: string | null
        modulePrefix: string | null
        weightPercentage: number | null
        settings: string
        students: string
        objectives: string
        grids: string
      }
    | undefined

  if (!row) return null

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    moduleNumber: row.moduleNumber,
    modulePrefix: row.modulePrefix as 'I' | 'C' | null,
    weightPercentage: row.weightPercentage,
    settings: JSON.parse(row.settings),
    students: JSON.parse(row.students),
    objectives: JSON.parse(row.objectives),
    grids: JSON.parse(row.grids),
  }
}

// Sauvegarder une grille d'évaluation (mise à jour persistente en DB)
export function saveGridToProject(projectId: string, grid: StudentGrid): void {
  const db = getDatabase()
  
  const project = getProject(projectId)
  
  if (!project) {
    console.error('Failed to save grid: Project not found:', projectId)
    return
  }

  // Mettre à jour la grille de l'étudiant dans le projet
  const updatedGrids = project.grids.map((g) =>
    g.studentId === grid.studentId ? grid : g,
  )
  
  // Si la grille n'existe pas, l'ajouter
  if (!updatedGrids.some((g) => g.studentId === grid.studentId)) {
    updatedGrids.push(grid)
  }

  try {
    // Sauvegarder le projet mis à jour en DB
    db.prepare(
      `UPDATE projects 
       SET grids = ?, updatedAt = ? 
       WHERE id = ?`,
    ).run(
      JSON.stringify(updatedGrids),
      new Date().toISOString(),
      projectId,
    )
  } catch (error) {
    console.error('Failed to update project in database:', error)
    throw error
  }
}

export function createProject(name: string, description: string = ''): EvaluationProject {
  const db = getDatabase()

  // Parse module info
  const moduleMatch = name.match(/([IC]?\s*)?(\d{3})/)
  const moduleNumber = moduleMatch ? moduleMatch[2] : null
  const modulePrefix = moduleMatch && moduleMatch[1]
    ? (moduleMatch[1].trim() as 'I' | 'C')
    : null
  const weightPercentage = modulePrefix === 'I' ? 0.8 : modulePrefix === 'C' ? 0.2 : null

  const cleanDefaultSettings: AppSettings = {
    classAverage: 4,
    threshold: DEFAULT_THRESHOLD,
    correctionError: DEFAULT_CORRECTION_ERROR,
    moduleName: name,
    testIdentifier: '',
    testType: 'sommatif',
    moduleDescription: description || '',
    correctedBy: '',
    showObjectives: true,
    studentTabsLocked: false,
    maxQuestionsToAnswer: null,
    testDate: new Date().toISOString().split('T')[0],
    schoolName: '',
  }

  const project: EvaluationProject = {
    id: crypto.randomUUID(),
    name,
    description,
    createdAt: new Date(),
    updatedAt: new Date(),
    settings: cleanDefaultSettings,
    students: [],
    objectives: [],
    grids: [],
    moduleNumber,
    modulePrefix,
    weightPercentage,
  }

  db.prepare(
    `INSERT INTO projects (
      id, name, description, createdAt, updatedAt,
      moduleNumber, modulePrefix, weightPercentage,
      settings, students, objectives, grids
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    project.id,
    project.name,
    project.description,
    project.createdAt.toISOString(),
    project.updatedAt.toISOString(),
    project.moduleNumber,
    project.modulePrefix,
    project.weightPercentage,
    JSON.stringify(project.settings),
    JSON.stringify(project.students),
    JSON.stringify(project.objectives),
    JSON.stringify(project.grids),
  )

  return project
}

export function updateProject(project: EvaluationProject): void {
  const db = getDatabase()

  db.prepare(
    `UPDATE projects SET
      name = ?, description = ?, updatedAt = ?,
      moduleNumber = ?, modulePrefix = ?, weightPercentage = ?,
      settings = ?, students = ?, objectives = ?, grids = ?
    WHERE id = ?`,
  ).run(
    project.name,
    project.description,
    new Date().toISOString(),
    project.moduleNumber,
    project.modulePrefix,
    project.weightPercentage,
    JSON.stringify(project.settings),
    JSON.stringify(project.students),
    JSON.stringify(project.objectives),
    JSON.stringify(project.grids),
    project.id,
  )
}

export function deleteProject(id: string): void {
  const db = getDatabase()
  db.prepare('DELETE FROM projects WHERE id = ?').run(id)
}

export function duplicateProject(id: string): EvaluationProject {
  const source = getProject(id)
  if (!source) throw new Error('Project not found')

  const copy: EvaluationProject = {
    ...source,
    id: crypto.randomUUID(),
    name: `${source.name} (copie)`,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const db = getDatabase()
  db.prepare(
    `INSERT INTO projects (
      id, name, description, createdAt, updatedAt,
      moduleNumber, modulePrefix, weightPercentage,
      settings, students, objectives, grids
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    copy.id,
    copy.name,
    copy.description,
    copy.createdAt.toISOString(),
    copy.updatedAt.toISOString(),
    copy.moduleNumber,
    copy.modulePrefix,
    copy.weightPercentage,
    JSON.stringify(copy.settings),
    JSON.stringify(copy.students),
    JSON.stringify(copy.objectives),
    JSON.stringify(copy.grids),
  )

  return copy
}

export function createEvaluation(baseProjectId: string): EvaluationProject {
  const baseProject = getProject(baseProjectId)
  if (!baseProject) throw new Error('Base project not found')

  const db = getDatabase()
  const baseModuleNumber = baseProject.moduleNumber

  // Trouver les projets du même module
  const sameModuleProjects = db
    .prepare('SELECT * FROM projects WHERE moduleNumber = ?')
    .all(baseModuleNumber) as Array<{ settings: string }>

  // Compter les EP existants
  const epNumbers = sameModuleProjects
    .map((p) => {
      const settings = JSON.parse(p.settings) as AppSettings
      const match = settings.testIdentifier.match(/EP(\d+)/)
      return match ? parseInt(match[1], 10) : 0
    })
    .filter(Boolean)

  const nextEpNumber = Math.max(...epNumbers, 0) + 1
  const nextEpId = `EP${nextEpNumber}`

  // Note: Les squelettes (ModuleTemplates) sont gérés uniquement côté client (Dexie)
  // pour le moment. L'injection automatique des objectifs se fait dans db.ts
  // Si on est dans Electron, on crée l'EP sans objectifs, et le client devra
  // potentiellement les injecter après coup s'il trouve un squelette.
  // Pour garder la cohérence, on laisse le tableau vide ici.

  const newEvaluation: EvaluationProject = {
    ...baseProject,
    id: crypto.randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date(),
    students: baseProject.students,
    objectives: [],
    grids: [],
    settings: {
      ...baseProject.settings,
      testIdentifier: nextEpId,
    },
  }

  db.prepare(
    `INSERT INTO projects (
      id, name, description, createdAt, updatedAt,
      moduleNumber, modulePrefix, weightPercentage,
      settings, students, objectives, grids
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    newEvaluation.id,
    newEvaluation.name,
    newEvaluation.description,
    newEvaluation.createdAt.toISOString(),
    newEvaluation.updatedAt.toISOString(),
    newEvaluation.moduleNumber,
    newEvaluation.modulePrefix,
    newEvaluation.weightPercentage,
    JSON.stringify(newEvaluation.settings),
    JSON.stringify(newEvaluation.students),
    JSON.stringify(newEvaluation.objectives),
    JSON.stringify(newEvaluation.grids),
  )

  return newEvaluation
}

// Export/Import
export function exportDatabase(): string {
  const projects = getProjects()
  const settings = getSettings()

  return JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      projects,
      settings,
    },
    null,
    2,
  )
}

export function importDatabase(jsonData: string, merge: boolean = false): void {
  try {
    const data = JSON.parse(jsonData)
    
    // Valider que les données contiennent au moins des projets
    if (!data.projects || !Array.isArray(data.projects) || data.projects.length === 0) {
      throw new Error('Fichier de sauvegarde invalide ou vide - aucun projet trouvé')
    }

    const db = getDatabase()

    // IMPORTANT: Ne supprimer que si les données d'import sont valides ET en non-merge
    if (!merge) {
      // Supprimer tous les projets existants
      db.prepare('DELETE FROM projects').run()
    }

    // Importer les projets
    for (const project of data.projects) {
      const existing = db.prepare('SELECT id FROM projects WHERE id = ?').get(project.id)

      if (!existing || !merge) {
        db.prepare(
          `INSERT OR REPLACE INTO projects (
            id, name, description, createdAt, updatedAt,
            moduleNumber, modulePrefix, weightPercentage,
            settings, students, objectives, grids
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(
          project.id,
          project.name,
          project.description,
          new Date(project.createdAt).toISOString(),
          new Date(project.updatedAt).toISOString(),
          project.moduleNumber,
          project.modulePrefix,
          project.weightPercentage,
          JSON.stringify(project.settings),
          JSON.stringify(project.students),
          JSON.stringify(project.objectives),
          JSON.stringify(project.grids),
        )
      }
    }

    // Importer les settings si pas en mode fusion
    if (!merge && data.settings) {
      setSettings(data.settings)
    }
  } catch (error) {
    console.error('Import failed:', error)
    throw new Error(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Export d'un MEV unique
export function exportProject(projectId: string): string {
  const project = getProject(projectId)
  if (!project) throw new Error('Project not found')

  return JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      project,
    },
    null,
    2,
  )
}

// Export tous les MEV en ZIP
export async function exportAllProjectsAsZip(): Promise<Buffer> {
  const projects = getProjects()
  const zip = new JSZip()

  const date = new Date().toISOString().split('T')[0]
  const folderName = `MEV_BACKUP_${date}`

  for (const project of projects) {
    const exportData = JSON.stringify(
      {
        version: 1,
        exportedAt: new Date().toISOString(),
        project,
      },
      null,
      2,
    )

    // Créer un nom de fichier unique basé sur le module et l'identifiant
    const moduleInfo = project.moduleNumber
      ? `Module${project.moduleNumber}_${project.settings.testIdentifier}`
      : `Evaluation_${project.settings.testIdentifier}`
    const sanitizedName = moduleInfo.replace(/[<>:"|?*\\]/g, '_')
    const filename = `${sanitizedName}_${date}.json`

    zip.file(`${folderName}/${filename}`, exportData)
  }

  return await zip.generateAsync({ type: 'nodebuffer' })
}

// ============ USERS ============
export function getCurrentUser(): User | null {
  const db = getDatabase()
  const row = db.prepare('SELECT * FROM users ORDER BY lastLogin DESC LIMIT 1').get() as any
  
  if (!row) return null
  
  return {
    id: row.id,
    name: row.name,
    initials: row.initials,
    color: row.color,
    createdAt: new Date(row.createdAt),
    lastLogin: new Date(row.lastLogin),
  }
}

export function getUser(userId: string): User | null {
  const db = getDatabase()
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any
  
  if (!row) return null
  
  return {
    id: row.id,
    name: row.name,
    initials: row.initials,
    color: row.color,
    createdAt: new Date(row.createdAt),
    lastLogin: new Date(row.lastLogin),
  }
}

export function getAllUsers(): User[] {
  const db = getDatabase()
  const rows = db.prepare('SELECT * FROM users ORDER BY lastLogin DESC').all() as any[]
  
  return rows.map(row => ({
    id: row.id,
    name: row.name,
    initials: row.initials,
    color: row.color,
    createdAt: new Date(row.createdAt),
    lastLogin: new Date(row.lastLogin),
  }))
}

export function createUser(name: string): User {
  const db = getDatabase()
  const id = crypto.randomUUID()
  
  const initials = generateUserInitials(name)
  
  // Générer une couleur aléatoire stabilisée basée sur le nom
  const colors = [
    '#3B82F6', // bleu
    '#10B981', // vert
    '#F59E0B', // orange
    '#EF4444', // rouge
    '#8B5CF6', // violet
    '#EC4899', // rose
    '#06B6D4', // cyan
    '#14B8A6', // teal
  ]
  
  const colorIndex = name.charCodeAt(0) % colors.length
  const color = colors[colorIndex]
  
  const now = new Date().toISOString()
  
  db.prepare(
    `INSERT INTO users (id, name, initials, color, createdAt, lastLogin)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, name, initials, color, now, now)
  
  return {
    id,
    name,
    initials,
    color,
    createdAt: new Date(now),
    lastLogin: new Date(now),
  }
}

export function loginUser(userId: string): User {
  const db = getDatabase()
  const now = new Date().toISOString()
  
  db.prepare('UPDATE users SET lastLogin = ? WHERE id = ?').run(now, userId)
  
  const user = getUser(userId)
  if (!user) throw new Error('User not found')
  
  return user
}

export function updateUser(userId: string, name: string): User {
  const db = getDatabase()
  const initials = generateUserInitials(name)
  db.prepare('UPDATE users SET name = ?, initials = ? WHERE id = ?').run(name, initials, userId)
  
  const user = getUser(userId)
  if (!user) throw new Error('User not found')
  
  return user
}

/* Mettre à jour l'utilisateur avec initiales personnalisées */
export function updateUserWithInitials(userId: string, name: string, initials: string): User {
  const db = getDatabase()
  const normalizedInitials = initials.toUpperCase().slice(0, 3)
  db.prepare('UPDATE users SET name = ?, initials = ? WHERE id = ?').run(name, normalizedInitials, userId)
  
  const user = getUser(userId)
  if (!user) throw new Error('User not found')
  
  return user
}

export function deleteUser(userId: string): void {
  const db = getDatabase()
  db.prepare('DELETE FROM users WHERE id = ?').run(userId)
}

// Track user evaluations
export function recordUserEvaluation(userId: string, projectId: string): void {
  const db = getDatabase()
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  
  db.prepare(
    `INSERT INTO user_evaluations (id, userId, projectId, lastOpenedAt)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(userId, projectId) DO UPDATE SET lastOpenedAt = ?`,
  ).run(id, userId, projectId, now, now)
}

export function getUserRecentProjects(userId: string, limit = 5): Array<{ project: EvaluationProject; lastOpenedAt: Date }> {
  const db = getDatabase()
  const rows = db
    .prepare(`
      SELECT p.*, ue.lastOpenedAt
      FROM user_evaluations ue
      JOIN projects p ON ue.projectId = p.id
      WHERE ue.userId = ?
      ORDER BY ue.lastOpenedAt DESC
      LIMIT ?
    `)
    .all(userId, limit) as any[]
  
  return rows.map(row => ({
    project: {
      id: row.id,
      name: row.name,
      description: row.description,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      moduleNumber: row.moduleNumber,
      modulePrefix: row.modulePrefix,
      weightPercentage: row.weightPercentage,
      settings: JSON.parse(row.settings),
      students: JSON.parse(row.students),
      objectives: JSON.parse(row.objectives),
      grids: JSON.parse(row.grids),
    },
    lastOpenedAt: new Date(row.lastOpenedAt),
  }))
}

export function getUserProjectsByModule(userId: string): Array<{ module: string; projects: EvaluationProject[] }> {
  const db = getDatabase()
  const rows = db
    .prepare(`
      SELECT DISTINCT p.*, ue.lastOpenedAt
      FROM user_evaluations ue
      JOIN projects p ON ue.projectId = p.id
      WHERE ue.userId = ?
      ORDER BY p.moduleNumber DESC, ue.lastOpenedAt DESC
    `)
    .all(userId) as any[]
  
  const grouped: Record<string, any[]> = {}
  
  rows.forEach(row => {
    const module = row.moduleNumber || 'Autres'
    if (!grouped[module]) grouped[module] = []
    
    grouped[module].push({
      id: row.id,
      name: row.name,
      description: row.description,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      moduleNumber: row.moduleNumber,
      modulePrefix: row.modulePrefix,
      weightPercentage: row.weightPercentage,
      settings: JSON.parse(row.settings),
      students: JSON.parse(row.students),
      objectives: JSON.parse(row.objectives),
      grids: JSON.parse(row.grids),
    })
  })
  
  return Object.entries(grouped).map(([module, projects]) => ({
    module,
    projects,
  }))
}
