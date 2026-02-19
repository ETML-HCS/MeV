import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAllUsers } from '../../lib/db'
import type { User } from '../../types'
import { useUserStore } from '../../stores/useUserStore'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
}

export const LoginModal = ({ isOpen, onClose }: LoginModalProps) => {
  const [mode, setMode] = useState<'list' | 'new'>('list')
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const { signup, login } = useUserStore()

  const usersQuery = useQuery({
    queryKey: ['allUsers'],
    queryFn: getAllUsers,
    enabled: isOpen,
  })

  const users = usersQuery.data ?? []

  const handleExistingUserLogin = async (userId: string) => {
    setIsLoading(true)
    try {
      await login(userId)
      onClose()
    } finally {
      setIsLoading(false)
    }
  }

  const handleNewUserSignup = async () => {
    if (!name.trim()) return
    setError('')
    setIsLoading(true)
    try {
      console.log('Attempting to create user:', name.trim())
      await signup(name.trim())
      console.log('User created successfully')
      setName('')
      onClose()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la création du profil'
      console.error('Signup error:', error, errorMessage)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSkip = () => {
    setError('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="bg-linear-to-r from-blue-600 to-blue-700 px-6 py-8 text-white">
          <h2 className="text-2xl font-bold">Bienvenue</h2>
          <p className="text-blue-100 text-sm mt-2">
            Identifiez-vous pour accéder à vos évaluations
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {mode === 'list' ? (
            <>
              {/* Existing Users */}
              {users.length > 0 && (
                <div className="space-y-3 mb-6">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Utilisateurs existants
                  </p>
                  <div className="space-y-2">
                    {users.map((user: User) => (
                      <button
                        key={user.id}
                        onClick={() => handleExistingUserLogin(user.id)}
                        disabled={isLoading}
                        className="w-full p-3 border border-slate-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                            style={{ backgroundColor: user.color }}
                          >
                            {user.initials}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 group-hover:text-blue-600">
                              {user.name}
                            </div>
                            <div className="text-xs text-slate-400">
                              Dernier accès :{' '}
                              {new Date(user.lastLogin).toLocaleDateString('fr-FR')}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="border-t pt-4" />
                </div>
              )}

              {/* New User Button */}
              <button
                onClick={() => setMode('new')}
                disabled={isLoading}
                className="w-full p-3 bg-linear-to-r from-emerald-600 to-emerald-500 text-white font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
              >
                ➕ Créer un nouveau profil
              </button>
            </>
          ) : (
            <>
              {/* New User Form */}
              <div className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700 font-medium">{error}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Votre nom
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleNewUserSignup()
                    }}
                    placeholder="ex: Martin Dupont"
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none transition-all"
                    autoFocus
                    disabled={isLoading}
                  />
                </div>

                <button
                  onClick={handleNewUserSignup}
                  disabled={!name.trim() || isLoading}
                  className="w-full p-3 bg-linear-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Création...' : 'Créer le profil'}
                </button>

                <button
                  onClick={() => {
                    setMode('list')
                    setError('')
                    setName('')
                  }}
                  disabled={isLoading}
                  className="w-full p-3 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition-all disabled:opacity-50"
                >
                  ← Retour
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 bg-slate-50">
          <button
            onClick={handleSkip}
            disabled={isLoading}
            className="w-full text-sm text-slate-600 hover:text-slate-900 font-medium disabled:opacity-50"
          >
            Continuer sans connexion
          </button>
        </div>
      </div>
    </div>
  )
}
