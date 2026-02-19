import { create } from 'zustand'
import type { User, EvaluationProject } from '../types'
import { getCurrentUser, loginUser, createUser, recordUserEvaluation, getUserRecentProjects, updateUser, updateUserWithInitials } from '../lib/db'

interface UserState {
  user: User | null
  recentProjects: Array<{ project: EvaluationProject; lastOpenedAt: Date }>
  isLoading: boolean
  isConnected: boolean
  
  // Actions
  initializeUser: () => Promise<void>
  login: (userId: string) => Promise<void>
  signup: (name: string) => Promise<void>
  updateProfile: (name: string, initials?: string) => Promise<void>
  logout: () => void
  recordProjectOpen: (projectId: string) => Promise<void>
  loadRecentProjects: () => Promise<void>
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  recentProjects: [],
  isLoading: true,
  isConnected: false,

  initializeUser: async () => {
    try {
      const user = await getCurrentUser()
      set({ 
        user, 
        isConnected: !!user,
        isLoading: false,
      })
      
      if (user) {
        await get().loadRecentProjects()
      }
    } catch (error) {
      console.error('Error initializing user:', error)
      set({ isLoading: false })
    }
  },

  login: async (userId: string) => {
    try {
      set({ isLoading: true })
      const user = await loginUser(userId)
      set({ user, isConnected: true })
      await get().loadRecentProjects()
    } catch (error) {
      console.error('Error logging in:', error)
    } finally {
      set({ isLoading: false })
    }
  },

  signup: async (name: string) => {
    try {
      set({ isLoading: true })
      const user = await createUser(name)
      set({ user, isConnected: true })
    } catch (error) {
      console.error('Error signing up:', error)
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  updateProfile: async (name: string, initials?: string) => {
    const { user } = get()
    if (!user) return
    
    try {
      set({ isLoading: true })
      const updatedUser = initials 
        ? await updateUserWithInitials(user.id, name, initials)
        : await updateUser(user.id, name)
      set({ user: updatedUser })
    } catch (error) {
      console.error('Error updating profile:', error)
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  logout: () => {
    set({ 
      user: null,
      isConnected: false,
      recentProjects: [],
    })
  },

  recordProjectOpen: async (projectId: string) => {
    const { user } = get()
    if (!user) return
    
    try {
      await recordUserEvaluation(user.id, projectId)
      await get().loadRecentProjects()
    } catch (error) {
      console.error('Error recording project open:', error)
    }
  },

  loadRecentProjects: async () => {
    const { user } = get()
    if (!user) return
    
    try {
      const recent = await getUserRecentProjects(user.id, 5)
      set({ recentProjects: recent })
    } catch (error) {
      console.error('Error loading recent projects:', error)
    }
  },
}))
