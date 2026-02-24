import { useCallback, useRef, useState } from 'react'
import { useUserStore } from '../../stores/useUserStore'
import { useAppStore } from '../../stores/useAppStore'
import { setSettings as saveSettingsToDB } from '../../lib/db'
import { useClickOutside } from '../../hooks/useClickOutside'

interface ProfileBadgeProps {
  onLoginClick: () => void
  onEditClick?: () => void
  saveStatus?: 'idle' | 'saving' | 'saved' | 'error'
}

export const ProfileBadge = ({ onLoginClick, onEditClick, saveStatus }: ProfileBadgeProps) => {
  const { user, logout } = useUserStore()
  const settings = useAppStore((s) => s.settings)
  const setSettingsStore = useAppStore((s) => s.setSettings)
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  useClickOutside(menuRef, useCallback(() => setShowMenu(false), []), showMenu)

  const preferredEvalView = settings.evaluationViewMode || 'objectives'
  const preferredObjView = settings.objectivesViewMode || 'objectives'

  const updateViewMode = (key: 'evaluationViewMode' | 'objectivesViewMode', value: 'objectives' | 'questions') => {
    const next = { ...settings, [key]: value }
    setSettingsStore(next)
    saveSettingsToDB(next)
  }

  // Déterminer le style de saveStatus s'il est fourni
  const getSaveStatusDisplay = () => {
    if (!saveStatus) return null
    
    switch (saveStatus) {
      case 'saving':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-[11px] font-medium text-blue-700 border border-blue-200">
            <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 1v6m0 6v6m4.22-18.97l-4.24 4.24m0 5.99l4.24 4.24m-8.88-16.46l-4.24 4.24m0 5.99l4.24 4.24" />
            </svg>
            Enregistrement...
          </span>
        )
      case 'saved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-[11px] font-medium text-emerald-700 border border-emerald-200">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            Enregistré
          </span>
        )
      case 'error':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 text-[11px] font-medium text-red-700 border border-red-200">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Erreur
          </span>
        )
      case 'idle':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 text-[11px] font-medium text-slate-600 border border-slate-200">
            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
            Auto-save
          </span>
        )
    }
  }

  if (!user) {
    return (
      <button
        onClick={onLoginClick}
        className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-all"
      >
        Se connecter
      </button>
    )
  }

  // Sinon, afficher le menu utilisateur classique avec l'indicateur de sauvegarde si présent
  return (
    <div className="flex items-center gap-4">
      {saveStatus && getSaveStatusDisplay()}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 transition-all"
          title={user.name}
        >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs"
          style={{ backgroundColor: user.color }}
        >
          {user.initials}
        </div>
        <span className="text-sm font-medium text-slate-700">{user.name}</span>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${showMenu ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </button>

      {showMenu && (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-10">
          <div className="p-4 border-b border-slate-200">
            <div className="font-semibold text-slate-900">{user.name}</div>
            <div className="text-xs text-slate-500 mt-1">
              Connecté depuis{' '}
              {new Date(user.createdAt).toLocaleDateString('fr-FR')}
            </div>
          </div>

          <div className="px-4 py-3 border-b border-slate-200">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Affichage par défaut
            </div>
            
            <div className="space-y-3">
              {/* Évaluation */}
              <div>
                <div className="text-[10px] font-medium text-slate-400 mb-1.5">ONGLET ÉVALUATION</div>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  <button
                    onClick={() => {
                      updateViewMode('evaluationViewMode', 'objectives')
                      setShowMenu(false)
                    }}
                    className={`flex-1 text-[11px] font-semibold py-1.5 rounded-md transition-all ${
                      preferredEvalView === 'objectives'
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Objectifs
                  </button>
                  <button
                    onClick={() => {
                      updateViewMode('evaluationViewMode', 'questions')
                      setShowMenu(false)
                    }}
                    className={`flex-1 text-[11px] font-semibold py-1.5 rounded-md transition-all ${
                      preferredEvalView === 'questions'
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Questions
                  </button>
                </div>
              </div>

              {/* Objectifs */}
              <div>
                <div className="text-[10px] font-medium text-slate-400 mb-1.5">ONGLET OBJECTIFS</div>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  <button
                    onClick={() => {
                      updateViewMode('objectivesViewMode', 'objectives')
                      setShowMenu(false)
                    }}
                    className={`flex-1 text-[11px] font-semibold py-1.5 rounded-md transition-all ${
                      preferredObjView === 'objectives'
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Objectifs
                  </button>
                  <button
                    onClick={() => {
                      updateViewMode('objectivesViewMode', 'questions')
                      setShowMenu(false)
                    }}
                    className={`flex-1 text-[11px] font-semibold py-1.5 rounded-md transition-all ${
                      preferredObjView === 'questions'
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Questions
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              onEditClick?.()
              setShowMenu(false)
            }}
            className="w-full text-left px-4 py-2.5 text-blue-600 hover:bg-blue-50 text-sm font-medium transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Modifier le profil
          </button>

          <button
            onClick={() => {
              logout()
              setShowMenu(false)
            }}
            className="w-full text-left px-4 py-2.5 text-red-600 hover:bg-red-50 text-sm font-medium transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Se déconnecter
          </button>
        </div>
      )}
      </div>
    </div>
  )
}
