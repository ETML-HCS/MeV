import Dexie, { type Table } from 'dexie'
import type { AppSettings, EvaluationProject, Student, Objective, StudentGrid, ModuleTemplate, EvaluationTemplate } from '../types'
import { DEFAULT_CORRECTION_ERROR, DEFAULT_THRESHOLD } from '../utils/constants'
import { parseModuleInfo } from '../utils/helpers'

// Vérifier que nous sommes dans Electron
const isElectron = typeof window !== 'undefined' && (window as any).electronAPI

if (!isElectron) {
  console.warn('⚠️ Running in browser mode - using Dexie IndexedDB for storage')
}

const api = (window as any).electronAPI

// Fonction utilitaire pour vérifier l'API
function ensureAPI() {
  if (!api) {
    console.warn('⚠️ ElectronAPI not available - using browser IndexedDB fallback')
    return false
  }
  return true
}

// Interface pour les settings
interface SettingRow {
  key: string
  value: AppSettings
}

// Classe Dexie pour le stockage IndexedDB en mode web
class EvaluationDatabase extends Dexie {
  students!: Table<Student, string>
  objectives!: Table<Objective, string>
  grids!: Table<StudentGrid, string>
  settings!: Table<SettingRow, string>
  projects!: Table<EvaluationProject, string>
  moduleTemplates!: Table<ModuleTemplate, string>
  evaluationTemplates!: Table<EvaluationTemplate, string>

  constructor() {
    super('mev-evaluation-db')
    this.version(7).stores({
      students: 'id, lastname, firstname, login, group',
      objectives: 'id, number, title',
      grids: 'studentId, generatedAt',
      settings: 'key',
      projects: 'id, createdAt, updatedAt, moduleNumber',
      moduleTemplates: 'id, name, createdAt, updatedAt, [modulePrefix+moduleNumber+testIdentifier]',
      evaluationTemplates: 'id, name, createdAt, updatedAt',
    })
  }
}

const dexieDb = new EvaluationDatabase()

export const defaultSettings: AppSettings = {
  classAverage: 4,
  threshold: DEFAULT_THRESHOLD,
  correctionError: DEFAULT_CORRECTION_ERROR,
  moduleName: 'Module ETML',
  testIdentifier: '',
  testType: 'sommatif',
  moduleDescription: "Grille d'évaluation",
  correctedBy: '',
  showObjectives: true,
  studentTabsLocked: false,
  maxQuestionsToAnswer: null,
  testDate: new Date().toISOString().split('T')[0],
  schoolName: 'ETML / CFPV',
}

export const getSettings = async (): Promise<AppSettings> => {
  if (ensureAPI()) {
    try {
      const settings = await api.getSettings()
      return { ...defaultSettings, ...settings }
    } catch (e) {
      console.error('Electron API error, falling back to Dexie:', e)
    }
  }
  
  const found = await dexieDb.settings.get('main')
  if (found) {
    return { ...defaultSettings, ...found.value }
  }
  await dexieDb.settings.put({ key: 'main', value: defaultSettings })
  return defaultSettings
}

export const setSettings = async (value: AppSettings): Promise<void> => {
  if (ensureAPI()) {
    try {
      await api.setSettings(value)
      return
    } catch (e) {
      console.error('Electron API error, falling back to Dexie:', e)
    }
  }
  
  await dexieDb.settings.put({ key: 'main', value })
}

// Projects CRUD
export const createProject = async (
  name: string,
  description: string = '',
): Promise<EvaluationProject> => {
  if (ensureAPI()) {
    try {
      return await api.createProject(name, description)
    } catch (e) {
      console.error('Electron API error, falling back to Dexie:', e)
    }
  }
  
  const moduleInfo = parseModuleInfo(name)
  const project: EvaluationProject = {
    id: crypto.randomUUID(),
    name,
    description,
    createdAt: new Date(),
    updatedAt: new Date(),
    settings: { 
      ...defaultSettings,
      moduleName: name,
      testIdentifier: 'EP1',
    },
    students: [],
    objectives: [],
    grids: [],
    moduleNumber: moduleInfo.moduleNumber,
    modulePrefix: moduleInfo.modulePrefix,
    weightPercentage: moduleInfo.weightPercentage,
  }
  await dexieDb.projects.add(project)
  return project
}

export const getProject = async (id: string): Promise<EvaluationProject | undefined> => {
  if (ensureAPI()) {
    try {
      return await api.getProject(id)
    } catch (e) {
      console.error('Electron API error, falling back to Dexie:', e)
    }
  }
  return await dexieDb.projects.get(id)
}

export const getProjects = async (): Promise<EvaluationProject[]> => {
  if (ensureAPI()) {
    try {
      return await api.getProjects()
    } catch (e) {
      console.error('Electron API error, falling back to Dexie:', e)
    }
  }
  return await dexieDb.projects.orderBy('updatedAt').reverse().toArray()
}

export const updateProject = async (project: EvaluationProject): Promise<void> => {
  if (ensureAPI()) {
    try {
      await api.updateProject(project)
      return
    } catch (e) {
      console.error('Electron API error, falling back to Dexie:', e)
    }
  }
  await dexieDb.projects.put({ ...project, updatedAt: new Date() })
}

export const deleteProject = async (id: string): Promise<void> => {
  if (ensureAPI()) {
    try {
      await api.deleteProject(id)
      return
    } catch (e) {
      console.error('Electron API error, falling back to Dexie:', e)
    }
  }
  await dexieDb.projects.delete(id)
}

export const duplicateProject = async (id: string): Promise<EvaluationProject> => {
  if (ensureAPI()) {
    try {
      return await api.duplicateProject(id)
    } catch (e) {
      console.error('Electron API error, falling back to Dexie:', e)
    }
  }
  
  const original = await dexieDb.projects.get(id)
  if (!original) throw new Error('Project not found')
  
  const duplicate: EvaluationProject = {
    ...original,
    id: crypto.randomUUID(),
    name: `${original.name} (copie)`,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  await dexieDb.projects.add(duplicate)
  return duplicate
}

export const createEvaluation = async (baseProjectId: string): Promise<EvaluationProject> => {
  let newEvaluation: EvaluationProject | null = null

  if (ensureAPI()) {
    try {
      newEvaluation = await api.createEvaluation(baseProjectId)
    } catch (e) {
      console.error('Electron API error, falling back to Dexie:', e)
    }
  }
  
  if (!newEvaluation) {
    const baseProject = await dexieDb.projects.get(baseProjectId)
    if (!baseProject) throw new Error('Base project not found')

    const sameModuleProjects = await dexieDb.projects
      .where('moduleNumber')
      .equals(baseProject.moduleNumber || '')
      .toArray()

    const epNumbers = sameModuleProjects
      .map((p) => {
        const match = p.settings.testIdentifier.match(/EP(\d+)/)
        return match ? parseInt(match[1], 10) : 0
      })
      .filter(Boolean)

    const nextEpNumber = Math.max(...epNumbers, 0) + 1
    const nextEpId = `EP${nextEpNumber}`

    newEvaluation = {
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
  }

  // Chercher un squelette correspondant (toujours dans Dexie car les templates n'y sont que là pour l'instant)
  if (newEvaluation.moduleNumber && newEvaluation.modulePrefix) {
    const template = await dexieDb.moduleTemplates
      .where('[modulePrefix+moduleNumber+testIdentifier]')
      .equals([newEvaluation.modulePrefix, newEvaluation.moduleNumber, newEvaluation.settings.testIdentifier])
      .first()

    if (template) {
      newEvaluation.objectives = template.objectives.map(obj => ({
        id: crypto.randomUUID(),
        number: obj.number,
        title: obj.title,
        description: obj.description,
        weight: obj.weight,
        indicators: []
      }))
    }
  }

  if (ensureAPI()) {
    try {
      await api.updateProject(newEvaluation)
    } catch (e) {
      console.error('Electron API error, falling back to Dexie:', e)
    }
  } else {
    await dexieDb.projects.add(newEvaluation)
  }

  return newEvaluation
}

// Export/Import
export interface DatabaseExport {
  version: number
  exportedAt: string
  projects: EvaluationProject[]
  settings: AppSettings
}

export const exportDatabase = async (): Promise<string> => {
  ensureAPI()
  return await api.exportDatabase()
}

export const importDatabase = async (
  jsonData: string,
  options: { merge: boolean } = { merge: false },
): Promise<void> => {
  ensureAPI()
  await api.importDatabase(jsonData, options.merge)
}

export const downloadBackup = async (jsonData: string, filename?: string): Promise<void> => {
  ensureAPI()
  const date = new Date().toISOString().split('T')[0]
  const defaultFilename = `mev-backup-${date}.json`
  
  await api.saveBackupToFile(jsonData, filename || defaultFilename)
}

export const loadBackupFile = async (): Promise<string | null> => {
  ensureAPI()
  return await api.loadBackupFromFile()
}

// Project exports
export const exportProject = async (projectId: string): Promise<string> => {
  ensureAPI()
  return await api.exportProject(projectId)
}

export const exportAllProjects = async (): Promise<Buffer> => {
  ensureAPI()
  return await api.exportAllProjects()
}

export const downloadProjectBackup = async (projectId: string, projectName?: string): Promise<void> => {
  ensureAPI()
  const date = new Date().toISOString().split('T')[0]
  const defaultFilename = `MEV_${projectName || projectId}_${date}.json`
  
  const jsonData = await exportProject(projectId)
  await api.saveProjectBackupToFile(jsonData, defaultFilename)
}

export const downloadAllProjectsBackup = async (): Promise<void> => {
  ensureAPI()
  const date = new Date().toISOString().split('T')[0]
  const filename = `MEV_BACKUP_ALL_${date}.zip`
  
  const zipBuffer = await exportAllProjects()
  await api.saveZipBackupToFile(zipBuffer, filename)
}

// User management
export const getCurrentUser = async () => {
  ensureAPI()
  return await api.getCurrentUser()
}

export const getUser = async (userId: string) => {
  ensureAPI()
  return await api.getUser(userId)
}

export const getAllUsers = async () => {
  ensureAPI()
  return await api.getAllUsers()
}

export const createUser = async (name: string) => {
  ensureAPI()
  return await api.createUser(name)
}

export const loginUser = async (userId: string) => {
  ensureAPI()
  return await api.loginUser(userId)
}

export const updateUser = async (userId: string, name: string) => {
  ensureAPI()
  return await api.updateUser(userId, name)
}

export const updateUserWithInitials = async (userId: string, name: string, initials: string) => {
  ensureAPI()
  return await api.updateUserWithInitials(userId, name, initials)
}

export const deleteUser = async (userId: string) => {
  ensureAPI()
  await api.deleteUser(userId)
}

export const recordUserEvaluation = async (userId: string, projectId: string) => {
  ensureAPI()
  await api.recordUserEvaluation(userId, projectId)
}

export const getUserRecentProjects = async (userId: string, limit?: number) => {
  ensureAPI()
  return await api.getUserRecentProjects(userId, limit)
}

export const getUserProjectsByModule = async (userId: string) => {
  ensureAPI()
  return await api.getUserProjectsByModule(userId)
}

// Mode web: utiliser Dexie IndexedDB
// Mode Electron: utiliser une couche proxy vers l'API IPC
export const db = {
  students: {
    toArray: async (): Promise<Student[]> => {
      if (ensureAPI()) {
        try {
          if (!api.getStudents) throw new Error('Method missing')
          return await api.getStudents() ?? []
        } catch (e) {
          console.error('Electron API error, falling back to Dexie:', e)
        }
      }
      return await dexieDb.students.toArray()
    },
    clear: async (): Promise<void> => {
      if (ensureAPI()) {
        try {
          if (!api.clearStudents) throw new Error('Method missing')
          await api.clearStudents()
          return
        } catch (e) {
          console.error('Electron API error, falling back to Dexie:', e)
        }
      }
      return await dexieDb.students.clear()
    },
    bulkAdd: async (students: Student[]): Promise<void> => {
      if (ensureAPI()) {
        try {
          if (!api.bulkAddStudents) throw new Error('Method missing')
          await api.bulkAddStudents(students)
          return
        } catch (e) {
          console.error('Electron API error, falling back to Dexie:', e)
        }
      }
      await dexieDb.students.bulkAdd(students)
    },
    bulkPut: async (students: Student[]): Promise<void> => {
      if (ensureAPI()) {
        try {
          if (!api.bulkPutStudents) throw new Error('Method missing')
          await api.bulkPutStudents(students)
          return
        } catch (e) {
          console.error('Electron API error, falling back to Dexie:', e)
        }
      }
      await dexieDb.students.bulkPut(students)
    },
    put: async (student: Student): Promise<string> => {
      if (ensureAPI()) {
        try {
          if (!api.saveStudent) throw new Error('Method missing')
          await api.saveStudent(student)
          return student.id
        } catch (e) {
          console.error('Electron API error, falling back to Dexie:', e)
        }
      }
      await dexieDb.students.put(student)
      return student.id
    },
    get: async (id: string): Promise<Student | undefined> => {
      if (ensureAPI()) {
        try {
          if (!api.getStudent) throw new Error('Method missing')
          return await api.getStudent(id)
        } catch (e) {
          console.error('Electron API error, falling back to Dexie:', e)
        }
      }
      return await dexieDb.students.get(id)
    },
    delete: async (id: string): Promise<void> => {
      if (ensureAPI()) {
        try {
          await api.deleteStudent?.(id)
          return
        } catch (e) {
          console.error('Electron API error, falling back to Dexie:', e)
        }
      }
      return await dexieDb.students.delete(id)
    },
    orderBy: (field: string) => ({
      toArray: async (): Promise<Student[]> => {
        if (ensureAPI()) {
          try {
            return await api.getStudentsSorted?.(field) ?? []
          } catch (e) {
            console.error('Electron API error, falling back to Dexie:', e)
          }
        }
        return await dexieDb.students.orderBy(field).toArray()
      },
    }),
  },
  objectives: {
    toArray: async (): Promise<Objective[]> => {
      if (ensureAPI()) {
        try {
          return await api.getObjectives?.() ?? []
        } catch (e) {
          console.error('Electron API error, falling back to Dexie:', e)
        }
      }
      return await dexieDb.objectives.toArray()
    },
    clear: async (): Promise<void> => {
      if (ensureAPI()) {
        try {
          await api.clearObjectives?.()
          return
        } catch (e) {
          console.error('Electron API error, falling back to Dexie:', e)
        }
      }
      return await dexieDb.objectives.clear()
    },
    bulkAdd: async (objectives: Objective[]): Promise<void> => {
      if (ensureAPI()) {
        try {
          if (!api.bulkAddObjectives) throw new Error('Method missing')
          await api.bulkAddObjectives(objectives)
          return
        } catch (e) {
          console.error('Electron API error, falling back to Dexie:', e)
        }
      }
      await dexieDb.objectives.bulkAdd(objectives)
    },
    bulkPut: async (objectives: Objective[]): Promise<void> => {
      if (ensureAPI()) {
        try {
          if (!api.bulkPutObjectives) throw new Error('Method missing')
          await api.bulkPutObjectives(objectives)
          return
        } catch (e) {
          console.error('Electron API error, falling back to Dexie:', e)
        }
      }
      await dexieDb.objectives.bulkPut(objectives)
    },
    put: async (objective: Objective): Promise<string> => {
      if (ensureAPI()) {
        try {
          if (!api.saveObjective) throw new Error('Method missing')
          await api.saveObjective(objective)
          return objective.id
        } catch (e) {
          console.error('Electron API error, falling back to Dexie:', e)
        }
      }
      await dexieDb.objectives.put(objective)
      return objective.id
    },
    get: async (id: string): Promise<Objective | undefined> => {
      if (ensureAPI()) {
        try {
          if (!api.getObjective) throw new Error('Method missing')
          return await api.getObjective(id)
        } catch (e) {
          console.error('Electron API error, falling back to Dexie:', e)
        }
      }
      return await dexieDb.objectives.get(id)
    },
    delete: async (id: string): Promise<void> => {
      if (ensureAPI()) {
        try {
          if (!api.deleteObjective) throw new Error('Method missing')
          await api.deleteObjective(id)
          return
        } catch (e) {
          console.error('Electron API error, falling back to Dexie:', e)
        }
      }
      return await dexieDb.objectives.delete(id)
    },
    orderBy: (field: string) => ({
      toArray: async (): Promise<Objective[]> => {
        if (ensureAPI()) {
          try {
            if (!api.getObjectivesSorted) throw new Error('Method missing')
            return await api.getObjectivesSorted(field) ?? []
          } catch (e) {
            console.error('Electron API error, falling back to Dexie:', e)
          }
        }
        return await dexieDb.objectives.orderBy(field).toArray()
      },
    }),
  },
  grids: {
    toArray: async (): Promise<StudentGrid[]> => {
      if (ensureAPI()) {
        try {
          if (!api.getGrids) throw new Error('Method missing')
          return await api.getGrids() ?? []
        } catch (e) {
          console.error('Electron API error, falling back to Dexie:', e)
        }
      }
      return await dexieDb.grids.toArray()
    },
    clear: async (): Promise<void> => {
      if (ensureAPI()) {
        try {
          if (!api.clearGrids) throw new Error('Method missing')
          await api.clearGrids()
          return
        } catch (e) {
          console.error('Electron API error, falling back to Dexie:', e)
        }
      }
      return await dexieDb.grids.clear()
    },
    bulkAdd: async (grids: StudentGrid[]): Promise<void> => {
      if (ensureAPI()) {
        try {
          if (!api.bulkAddGrids) throw new Error('Method missing')
          await api.bulkAddGrids(grids)
          return
        } catch (e) {
          console.error('Electron API error, falling back to Dexie:', e)
        }
      }
      await dexieDb.grids.bulkAdd(grids)
    },
    bulkPut: async (grids: StudentGrid[]): Promise<void> => {
      if (ensureAPI()) {
        try {
          if (!api.bulkPutGrids) throw new Error('Method missing')
          await api.bulkPutGrids(grids)
          return
        } catch (e) {
          console.error('Electron API error, falling back to Dexie:', e)
        }
      }
      await dexieDb.grids.bulkPut(grids)
    },
    put: async (grid: StudentGrid, projectId?: string): Promise<string> => {
      if (ensureAPI()) {
        try {
          if (!api.saveGrid) throw new Error('Method missing')
          // Passer le projectId pour que la sauvegarde soit persistée en DB
          await api.saveGrid(grid, projectId)
          return grid.studentId
        } catch (e) {
          console.error('Electron API error, falling back to Dexie:', e)
        }
      }
      await dexieDb.grids.put(grid)
      return grid.studentId
    },
    get: async (id: string): Promise<StudentGrid | undefined> => {
      if (ensureAPI()) {
        try {
          if (!api.getGrid) throw new Error('Method missing')
          return await api.getGrid(id)
        } catch (e) {
          console.error('Electron API error, falling back to Dexie:', e)
        }
      }
      return await dexieDb.grids.get(id)
    },
    delete: async (id: string): Promise<void> => {
      if (ensureAPI()) {
        try {
          if (!api.deleteGrid) throw new Error('Method missing')
          await api.deleteGrid(id)
          return
        } catch (e) {
          console.error('Electron API error, falling back to Dexie:', e)
        }
      }
      return await dexieDb.grids.delete(id)
    },
    find: (_predicate: (grid: StudentGrid) => boolean): StudentGrid | undefined => undefined,
  },
  settings: {
    get: async (key: string): Promise<{ key: string; value: AppSettings } | undefined> => {
      if (ensureAPI()) {
        try {
          if (!api.getSettings) throw new Error('Method missing')
          const settings = await api.getSettings()
          if (settings) {
            return { key: 'main', value: settings }
          }
        } catch (e) {
          console.error('Electron API error, falling back to Dexie:', e)
        }
      }
      return await dexieDb.settings.get(key)
    },
    put: async (setting: { key: string; value: AppSettings }): Promise<string> => {
      if (ensureAPI()) {
        try {
          if (!api.setSettings) throw new Error('Method missing')
          await api.setSettings(setting.value)
          return setting.key
        } catch (e) {
          console.error('Electron API error, falling back to Dexie:', e)
        }
      }
      await dexieDb.settings.put(setting)
      return setting.key
    },
  },
  projects: {
    toArray: async (): Promise<EvaluationProject[]> => {
      if (ensureAPI()) {
        try {
          if (!api.getProjects) throw new Error('Method missing')
          return await api.getProjects() ?? []
        } catch (e) {
          console.error('Electron API error, falling back to Dexie:', e)
        }
      }
      return await dexieDb.projects.toArray()
    },
    add: async (project: EvaluationProject): Promise<string> => {
      if (ensureAPI()) {
        try {
          if (!api.createProject) throw new Error('Method missing')
          await api.createProject(project.name, project.description)
          return project.id
        } catch (e) {
          console.error('Electron API error, falling back to Dexie:', e)
        }
      }
      await dexieDb.projects.add(project)
      return project.id
    },
    get: async (id: string): Promise<EvaluationProject | undefined> => {
      if (ensureAPI()) {
        try {
          if (!api.getProject) throw new Error('Method missing')
          return await api.getProject(id)
        } catch (e) {
          console.error('Electron API error, falling back to Dexie:', e)
        }
      }
      return await dexieDb.projects.get(id)
    },
    put: async (project: EvaluationProject): Promise<string> => {
      if (ensureAPI()) {
        try {
          if (!api.updateProject) throw new Error('Method missing')
          await api.updateProject(project)
          return project.id
        } catch (e) {
          console.error('Electron API error, falling back to Dexie:', e)
        }
      }
      await dexieDb.projects.put(project)
      return project.id
    },
    delete: async (id: string): Promise<void> => {
      if (ensureAPI()) {
        try {
          if (!api.deleteProject) throw new Error('Method missing')
          await api.deleteProject(id)
          return
        } catch (e) {
          console.error('Electron API error, falling back to Dexie:', e)
        }
      }
      return await dexieDb.projects.delete(id)
    },
    where: (field: string) => ({
      equals: (value: any) => ({
        toArray: async (): Promise<EvaluationProject[]> => {
          if (ensureAPI()) {
            try {
              if (!api.getProjectsWhere) throw new Error('Method missing')
              return await api.getProjectsWhere(field, value) ?? []
            } catch (e) {
              console.error('Electron API error, falling back to Dexie:', e)
            }
          }
          return await dexieDb.projects.where(field).equals(value).toArray()
        },
      }),
    }),
    orderBy: (field: string) => ({
      reverse: () => ({
        toArray: async (): Promise<EvaluationProject[]> => {
          if (ensureAPI()) {
            try {
              if (!api.getProjectsSorted) throw new Error('Method missing')
              return await api.getProjectsSorted(field, true) ?? []
            } catch (e) {
              console.error('Electron API error, falling back to Dexie:', e)
            }
          }
          return await dexieDb.projects.orderBy(field).reverse().toArray()
        },
      }),
    }),
  },
  moduleTemplates: {
    toArray: async (): Promise<ModuleTemplate[]> => {
      // Pour l'instant, pas d'API Electron pour les templates, on utilise seulement Dexie
      return await dexieDb.moduleTemplates.toArray()
    },
    add: async (template: ModuleTemplate): Promise<string> => {
      await dexieDb.moduleTemplates.add(template)
      return template.id
    },
    put: async (template: ModuleTemplate): Promise<string> => {
      await dexieDb.moduleTemplates.put(template)
      return template.id
    },
    get: async (id: string): Promise<ModuleTemplate | undefined> => {
      return await dexieDb.moduleTemplates.get(id)
    },
    delete: async (id: string): Promise<void> => {
      return await dexieDb.moduleTemplates.delete(id)
    },
    orderBy: (field: string) => ({
      reverse: () => ({
        toArray: async (): Promise<ModuleTemplate[]> => {
          return await dexieDb.moduleTemplates.orderBy(field).reverse().toArray()
        },
      }),
    }),
  },
  evaluationTemplates: {
    toArray: async (): Promise<EvaluationTemplate[]> => {
      return await dexieDb.evaluationTemplates.toArray()
    },
    add: async (template: EvaluationTemplate): Promise<string> => {
      await dexieDb.evaluationTemplates.add(template)
      return template.id
    },
    put: async (template: EvaluationTemplate): Promise<string> => {
      await dexieDb.evaluationTemplates.put(template)
      return template.id
    },
    get: async (id: string): Promise<EvaluationTemplate | undefined> => {
      return await dexieDb.evaluationTemplates.get(id)
    },
    delete: async (id: string): Promise<void> => {
      return await dexieDb.evaluationTemplates.delete(id)
    },
    orderBy: (field: string) => ({
      reverse: () => ({
        toArray: async (): Promise<EvaluationTemplate[]> => {
          return await dexieDb.evaluationTemplates.orderBy(field).reverse().toArray()
        },
      }),
    }),
  },
  transaction: async <T>(_mode: string, _tables: any, callback: () => Promise<T>): Promise<T> => {
    if (ensureAPI()) {
      try {
        return await callback()
      } catch (e) {
        console.error('Electron transaction error, falling back to Dexie:', e)
      }
    }
    return await dexieDb.transaction(_mode as any, _tables, callback)
  },
}
