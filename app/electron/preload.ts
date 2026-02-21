import { contextBridge, ipcRenderer } from 'electron'
import type {
  AppSettings,
  EvaluationProject,
  Objective,
  Student,
  StudentGrid,
} from '../src/types'

// API exposée au renderer de manière sécurisée
const electronAPI = {
  // Settings
  getSettings: () => ipcRenderer.invoke('db:getSettings'),
  setSettings: (settings: AppSettings) => ipcRenderer.invoke('db:setSettings', settings),

  // Projects
  getProjects: () => ipcRenderer.invoke('db:getProjects'),
  getProject: (id: string) => ipcRenderer.invoke('db:getProject', id),
  createProject: (name: string, description: string) =>
    ipcRenderer.invoke('db:createProject', name, description),
  updateProject: (project: EvaluationProject) => ipcRenderer.invoke('db:updateProject', project),
  deleteProject: (id: string) => ipcRenderer.invoke('db:deleteProject', id),
  duplicateProject: (id: string) => ipcRenderer.invoke('db:duplicateProject', id),
  createEvaluation: (baseProjectId: string) =>
    ipcRenderer.invoke('db:createEvaluation', baseProjectId),

  // Students
  getStudents: () => ipcRenderer.invoke('db:getStudents'),
  getStudentsSorted: (field: string) => ipcRenderer.invoke('db:getStudentsSorted', field),
  saveStudent: (student: Student) => ipcRenderer.invoke('db:saveStudent', student),
  getStudent: (id: string) => ipcRenderer.invoke('db:getStudent', id),
  bulkAddStudents: (students: Student[]) => ipcRenderer.invoke('db:bulkAddStudents', students),
  bulkPutStudents: (students: Student[]) => ipcRenderer.invoke('db:bulkPutStudents', students),
  clearStudents: () => ipcRenderer.invoke('db:clearStudents'),
  replaceAllStudents: (students: Student[]) =>
    ipcRenderer.invoke('db:replaceAllStudents', students),
  deleteStudent: (id: string) => ipcRenderer.invoke('db:deleteStudent', id),

  // Objectives
  getObjectives: () => ipcRenderer.invoke('db:getObjectives'),
  getObjectivesSorted: (field: string) => ipcRenderer.invoke('db:getObjectivesSorted', field),
  saveObjective: (objective: Objective) => ipcRenderer.invoke('db:saveObjective', objective),
  getObjective: (id: string) => ipcRenderer.invoke('db:getObjective', id),
  bulkAddObjectives: (objectives: Objective[]) => ipcRenderer.invoke('db:bulkAddObjectives', objectives),
  bulkPutObjectives: (objectives: Objective[]) => ipcRenderer.invoke('db:bulkPutObjectives', objectives),
  clearObjectives: () => ipcRenderer.invoke('db:clearObjectives'),
  deleteObjective: (id: string) => ipcRenderer.invoke('db:deleteObjective', id),
  reorderObjectives: (objectives: Objective[]) =>
    ipcRenderer.invoke('db:reorderObjectives', objectives),

  // Grids
  getGrids: () => ipcRenderer.invoke('db:getGrids'),
  getGrid: (studentId: string) => ipcRenderer.invoke('db:getGrid', studentId),
  saveGrid: (grid: StudentGrid, projectId?: string) => ipcRenderer.invoke('db:saveGrid', grid, projectId),
  bulkAddGrids: (grids: StudentGrid[], projectId?: string) => ipcRenderer.invoke('db:bulkAddGrids', grids, projectId),
  bulkPutGrids: (grids: StudentGrid[], projectId?: string) => ipcRenderer.invoke('db:bulkPutGrids', grids, projectId),
  clearGrids: () => ipcRenderer.invoke('db:clearGrids'),
  markGridAsCompleted: (studentId: string, projectId?: string) =>
    ipcRenderer.invoke('db:markGridAsCompleted', studentId, projectId),
  markGridAsIncomplete: (studentId: string, projectId?: string) =>
    ipcRenderer.invoke('db:markGridAsIncomplete', studentId, projectId),

  // Backup & Restore
  exportDatabase: () => ipcRenderer.invoke('db:export'),
  importDatabase: (jsonData: string, merge: boolean) =>
    ipcRenderer.invoke('db:import', jsonData, merge),
  
  // File operations
  saveBackupToFile: (data: string, filename: string) =>
    ipcRenderer.invoke('file:saveBackup', data, filename),
  loadBackupFromFile: () => ipcRenderer.invoke('file:loadBackup'),
  
  // Project export
  exportProject: (projectId: string) => ipcRenderer.invoke('project:export', projectId),
  exportAllProjects: () => ipcRenderer.invoke('project:exportAll'),
  saveProjectBackupToFile: (data: string, filename: string) =>
    ipcRenderer.invoke('file:saveProjectBackup', data, filename),
  saveZipBackupToFile: (buffer: Buffer, filename: string) =>
    ipcRenderer.invoke('file:saveZipBackup', buffer, filename),
  
  // User management
  getCurrentUser: () => ipcRenderer.invoke('user:getCurrentUser'),
  getUser: (userId: string) => ipcRenderer.invoke('user:getUser', userId),
  getAllUsers: () => ipcRenderer.invoke('user:getAllUsers'),
  createUser: (name: string) => ipcRenderer.invoke('user:create', name),
  loginUser: (userId: string) => ipcRenderer.invoke('user:login', userId),
  updateUser: (userId: string, name: string) => ipcRenderer.invoke('user:update', userId, name),
  updateUserWithInitials: (userId: string, name: string, initials: string) => ipcRenderer.invoke('user:updateWithInitials', userId, name, initials),
  deleteUser: (userId: string) => ipcRenderer.invoke('user:delete', userId),
  recordUserEvaluation: (userId: string, projectId: string) =>
    ipcRenderer.invoke('user:recordEvaluation', userId, projectId),
  getUserRecentProjects: (userId: string, limit?: number) =>
    ipcRenderer.invoke('user:getRecentProjects', userId, limit),
  getUserProjectsByModule: (userId: string) =>
    ipcRenderer.invoke('user:getProjectsByModule', userId),
}

// Exposer l'API au contexte du renderer
contextBridge.exposeInMainWorld('electronAPI', electronAPI)

// Types pour TypeScript
export type ElectronAPI = typeof electronAPI
