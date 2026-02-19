import { ipcMain, dialog } from 'electron'
import fs from 'node:fs/promises'
import type {
  AppSettings,
  EvaluationProject,
  Objective,
  Student,
  StudentGrid,
} from '../src/types'
import * as dbOperations from './database.js'

// Stockage temporaire en mémoire pour les élèves, objectifs, grids
// (persistés via le projet, pas comme tables séparées)
const memoryStore = {
  students: new Map<string, Student>(),
  objectives: new Map<string, Objective>(),
  grids: new Map<string, StudentGrid>(),
}

let currentProjectId: string | null = null

// Settings
ipcMain.handle('db:getSettings', () => {
  return dbOperations.getSettings()
})

ipcMain.handle('db:setSettings', (_event, settings: AppSettings) => {
  dbOperations.setSettings(settings)
})

// Projects
ipcMain.handle('db:getProjects', () => {
  return dbOperations.getProjects()
})

ipcMain.handle('db:getProject', (_event, id: string) => {
  const project = dbOperations.getProject(id)
  currentProjectId = project ? id : null
  return project
})

ipcMain.handle('db:createProject', (_event, name: string, description: string) => {
  return dbOperations.createProject(name, description)
})

ipcMain.handle('db:updateProject', (_event, project: EvaluationProject) => {
  dbOperations.updateProject(project)
})

ipcMain.handle('db:deleteProject', (_event, id: string) => {
  dbOperations.deleteProject(id)
})

ipcMain.handle('db:duplicateProject', (_event, id: string) => {
  return dbOperations.duplicateProject(id)
})

ipcMain.handle('db:createEvaluation', (_event, baseProjectId: string) => {
  return dbOperations.createEvaluation(baseProjectId)
})

// Students - stockés en mémoire, persistés via le projet
ipcMain.handle('db:getStudents', () => {
  return Array.from(memoryStore.students.values())
})

ipcMain.handle('db:getStudentsSorted', (_event, field: string) => {
  const students = Array.from(memoryStore.students.values())
  if (field === 'lastname') {
    return students.sort((a, b) => a.lastname.localeCompare(b.lastname))
  }
  return students
})

ipcMain.handle('db:getStudent', (_event, id: string) => {
  return memoryStore.students.get(id)
})

ipcMain.handle('db:saveStudent', (_event, student: Student) => {
  memoryStore.students.set(student.id, student)
  console.log('saveStudent called:', student.id)
  return student.id
})

ipcMain.handle('db:bulkAddStudents', (_event, students: Student[]) => {
  students.forEach(s => memoryStore.students.set(s.id, s))
  console.log('bulkAddStudents called:', students.length)
})

ipcMain.handle('db:bulkPutStudents', (_event, students: Student[]) => {
  students.forEach(s => memoryStore.students.set(s.id, s))
  console.log('bulkPutStudents called:', students.length)
})

ipcMain.handle('db:clearStudents', () => {
  memoryStore.students.clear()
  console.log('clearStudents called')
})

ipcMain.handle('db:replaceAllStudents', (_event, students: Student[]) => {
  memoryStore.students.clear()
  students.forEach(s => memoryStore.students.set(s.id, s))
  console.log('replaceAllStudents called:', students.length)
})

ipcMain.handle('db:deleteStudent', (_event, id: string) => {
  memoryStore.students.delete(id)
  console.log('deleteStudent called:', id)
})

// Objectives - stockés en mémoire, persistés via le projet
ipcMain.handle('db:getObjectives', () => {
  return Array.from(memoryStore.objectives.values())
})

ipcMain.handle('db:getObjectivesSorted', (_event, field: string) => {
  const objectives = Array.from(memoryStore.objectives.values())
  if (field === 'number') {
    return objectives.sort((a, b) => a.number - b.number)
  }
  return objectives
})

ipcMain.handle('db:getObjective', (_event, id: string) => {
  return memoryStore.objectives.get(id)
})

ipcMain.handle('db:saveObjective', (_event, objective: Objective) => {
  memoryStore.objectives.set(objective.id, objective)
  console.log('saveObjective called:', objective.id)
  return objective.id
})

ipcMain.handle('db:bulkAddObjectives', (_event, objectives: Objective[]) => {
  objectives.forEach(o => memoryStore.objectives.set(o.id, o))
  console.log('bulkAddObjectives called:', objectives.length)
})

ipcMain.handle('db:bulkPutObjectives', (_event, objectives: Objective[]) => {
  objectives.forEach(o => memoryStore.objectives.set(o.id, o))
  console.log('bulkPutObjectives called:', objectives.length)
})

ipcMain.handle('db:clearObjectives', () => {
  memoryStore.objectives.clear()
  console.log('clearObjectives called')
})

ipcMain.handle('db:deleteObjective', (_event, id: string) => {
  memoryStore.objectives.delete(id)
  console.log('deleteObjective called:', id)
})

ipcMain.handle('db:reorderObjectives', (_event, objectives: Objective[]) => {
  memoryStore.objectives.clear()
  objectives.forEach(o => memoryStore.objectives.set(o.id, o))
  console.log('reorderObjectives called:', objectives.length)
})

// Grids - stockés en mémoire, persistés via le projet
ipcMain.handle('db:getGrids', () => {
  return Array.from(memoryStore.grids.values())
})

ipcMain.handle('db:getGrid', (_event, studentId: string) => {
  return memoryStore.grids.get(studentId) ?? null
})

ipcMain.handle('db:saveGrid', (_event, grid: StudentGrid, projectId?: string) => {
  // Sauvegarder EN MÉMOIRE
  memoryStore.grids.set(grid.studentId, grid)
  const resolvedProjectId = projectId ?? currentProjectId
  
  // IMPORTANT: Sauvegarder aussi EN BASE DE DONNÉES (persistance)
  // Si projectId est fourni, persister via le projet
  if (resolvedProjectId) {
    try {
      dbOperations.saveGridToProject(resolvedProjectId, grid)
    } catch (error) {
      console.error('Failed to persist grid to database:', error)
    }
  }
  
  return grid.studentId
})

ipcMain.handle('db:bulkAddGrids', (_event, grids: StudentGrid[], projectId?: string) => {
  grids.forEach(g => memoryStore.grids.set(g.studentId, g))
  // CRITICAL FIX #3: Persist grids to database
  const pid = projectId || currentProjectId
  if (pid && grids.length > 0) {
    try {
      grids.forEach(grid => dbOperations.saveGridToProject(pid, grid))
    } catch (error) {
      console.error('Failed to persist bulk grids:', error)
    }
  }
})

ipcMain.handle('db:bulkPutGrids', (_event, grids: StudentGrid[], projectId?: string) => {
  grids.forEach(g => memoryStore.grids.set(g.studentId, g))
  // CRITICAL FIX #3: Persist grids to database
  const pid = projectId || currentProjectId
  if (pid && grids.length > 0) {
    try {
      grids.forEach(grid => dbOperations.saveGridToProject(pid, grid))
    } catch (error) {
      console.error('Failed to persist bulk grids:', error)
    }
  }
})

ipcMain.handle('db:clearGrids', () => {
  memoryStore.grids.clear()
  console.log('clearGrids called')
})

ipcMain.handle('db:markGridAsCompleted', (_event, studentId: string, projectId?: string) => {
  const grid = memoryStore.grids.get(studentId)
  if (grid) {
    grid.completedAt = new Date()
    // CRITICAL FIX #1: Persist to database
    const pid = projectId || currentProjectId
    if (pid) {
      try {
        dbOperations.saveGridToProject(pid, grid)
      } catch (error) {
        console.error('Failed to persist completed status:', error)
      }
    }
  }
})

ipcMain.handle('db:markGridAsIncomplete', (_event, studentId: string, projectId?: string) => {
  const grid = memoryStore.grids.get(studentId)
  if (grid) {
    grid.completedAt = null
    // CRITICAL FIX #1: Persist to database
    const pid = projectId || currentProjectId
    if (pid) {
      try {
        dbOperations.saveGridToProject(pid, grid)
      } catch (error) {
        console.error('Failed to persist incomplete status:', error)
      }
    }
  }
})

// Backup & Restore
ipcMain.handle('db:export', () => {
  return dbOperations.exportDatabase()
})

ipcMain.handle('db:import', (_event, jsonData: string, merge: boolean) => {
  dbOperations.importDatabase(jsonData, merge)
  // CRITICAL FIX #2: Reload memory stores after import
  memoryStore.students.clear()
  memoryStore.objectives.clear()
  memoryStore.grids.clear()
  currentProjectId = null
  console.log('✅ Memory stores cleared after import')
})

// File operations
ipcMain.handle('file:saveBackup', async (_event, data: string, filename: string) => {
  const { filePath } = await dialog.showSaveDialog({
    defaultPath: filename,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  })

  if (filePath) {
    await fs.writeFile(filePath, data, 'utf-8')
    return filePath
  }
  return null
})

ipcMain.handle('file:loadBackup', async () => {
  const { filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }],
  })

  if (filePaths.length > 0) {
    const data = await fs.readFile(filePaths[0], 'utf-8')
    return data
  }
  return null
})

// Project export
ipcMain.handle('project:export', (_event, projectId: string) => {
  return dbOperations.exportProject(projectId)
})

ipcMain.handle('project:exportAll', async () => {
  return await dbOperations.exportAllProjectsAsZip()
})

ipcMain.handle('file:saveProjectBackup', async (_event, data: string, filename: string) => {
  const { filePath } = await dialog.showSaveDialog({
    defaultPath: filename,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  })

  if (filePath) {
    await fs.writeFile(filePath, data, 'utf-8')
    return filePath
  }
  return null
})

ipcMain.handle('file:saveZipBackup', async (_event, buffer: Buffer, filename: string) => {
  const { filePath } = await dialog.showSaveDialog({
    defaultPath: filename,
    filters: [{ name: 'ZIP', extensions: ['zip'] }],
  })

  if (filePath) {
    await fs.writeFile(filePath, buffer)
    return filePath
  }
  return null
})

// User management
ipcMain.handle('user:getCurrentUser', () => {
  return dbOperations.getCurrentUser()
})

ipcMain.handle('user:getUser', (_event, userId: string) => {
  return dbOperations.getUser(userId)
})

ipcMain.handle('user:getAllUsers', () => {
  return dbOperations.getAllUsers()
})

ipcMain.handle('user:create', (_event, name: string) => {
  return dbOperations.createUser(name)
})

ipcMain.handle('user:login', (_event, userId: string) => {
  return dbOperations.loginUser(userId)
})

ipcMain.handle('user:update', (_event, userId: string, name: string) => {
  return dbOperations.updateUser(userId, name)
})

ipcMain.handle('user:updateWithInitials', (_event, userId: string, name: string, initials: string) => {
  return dbOperations.updateUserWithInitials(userId, name, initials)
})

ipcMain.handle('user:delete', (_event, userId: string) => {
  dbOperations.deleteUser(userId)
})

ipcMain.handle('user:recordEvaluation', (_event, userId: string, projectId: string) => {
  dbOperations.recordUserEvaluation(userId, projectId)
})

ipcMain.handle('user:getRecentProjects', (_event, userId: string, limit?: number) => {
  return dbOperations.getUserRecentProjects(userId, limit)
})

ipcMain.handle('user:getProjectsByModule', (_event, userId: string) => {
  return dbOperations.getUserProjectsByModule(userId)
})
