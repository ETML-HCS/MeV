import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AcademicYear, AppSettings, AppTab } from '../types'
import { detectAcademicYear } from '../utils/helpers'
import { defaultSettings } from '../lib/db'

interface AppUiState {
  activeTab: AppTab
  activeProjectId: string | null
  academicYear: AcademicYear
  selectedStudentId: string | null
  settings: AppSettings
  setActiveTab: (tab: AppTab) => void
  setActiveProjectId: (projectId: string | null) => void
  setSelectedStudentId: (studentId: string | null) => void
  setSettings: (settings: AppSettings) => void
}

export const useAppStore = create<AppUiState>()(
  persist(
    (set) => ({
      activeTab: 'projects',
      activeProjectId: null,
      academicYear: detectAcademicYear(),
      selectedStudentId: null,
      settings: defaultSettings,
      setActiveTab: (tab) => set({ activeTab: tab }),
      setActiveProjectId: (projectId) => set({ activeProjectId: projectId }),
      setSelectedStudentId: (studentId) => set({ selectedStudentId: studentId }),
      setSettings: (settings) => set({ settings }),
    }),
    {
      name: 'mev-evaluation-ui',
      partialize: (state) => ({
        activeTab: state.activeTab,
        activeProjectId: state.activeProjectId,
        academicYear: state.academicYear,
        selectedStudentId: state.selectedStudentId,
        // NOTE: settings volontairement exclues du persist
        // pour éviter le bleed entre projets au redémarrage
      }),
    },
  ),
)
