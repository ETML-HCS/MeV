import { useEffect, useRef } from 'react'

interface ShortcutsDialogProps {
  isOpen: boolean
  onClose: () => void
}

export const ShortcutsDialog = ({ isOpen, onClose }: ShortcutsDialogProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen) {
      dialog.showModal()
    } else {
      dialog.close()
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const shortcutGroups = [
    {
      title: 'Navigation Globale',
      shortcuts: [
        { keys: ['Ctrl', 'H'], desc: 'Afficher ce panneau d\'aide' },
        { keys: ['Ctrl', 'K'], desc: 'Ouvrir la palette de commandes' },
        { keys: ['Alt', '← / →'], desc: 'Naviguer entre les étapes (Dashboard, Élèves, etc.)' },
        { keys: ['F11'], desc: 'Activer/Désactiver le mode Zen (Plein écran)' },
      ]
    },
    {
      title: 'Actions Générales',
      shortcuts: [
        { keys: ['Ctrl', 'S'], desc: 'Sauvegarder manuellement' },
        { keys: ['Ctrl', 'F'], desc: 'Rechercher (focus sur la barre de recherche)' },
      ]
    },
    {
      title: 'Évaluation (Mode Focus)',
      shortcuts: [
        { keys: ['Ctrl', '← / →'], desc: 'Passer à l\'élève précédent / suivant' },
        { keys: ['Ctrl', 'O / Q'], desc: 'Changer de vue (Objectifs / Questions)' },
        { keys: ['0, 1, 2, 3'], desc: 'Attribuer une note (Insuffisant à Excellent)' },
        { keys: ['Entrée'], desc: 'Passer au critère suivant' },
      ]
    }
  ]

  return (
    <dialog
      ref={dialogRef}
      className="backdrop:bg-slate-900/50 backdrop:backdrop-blur-sm bg-transparent p-0 m-auto rounded-xl shadow-2xl open:animate-in open:fade-in-90 open:zoom-in-95"
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose()
      }}
    >
      <div className="bg-white w-[500px] max-w-[90vw] rounded-xl overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-800">Raccourcis Clavier</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Fermer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
          {shortcutGroups.map((group, i) => (
            <div key={i}>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                {group.title}
              </h3>
              <div className="space-y-2.5">
                {group.shortcuts.map((shortcut, j) => (
                  <div key={j} className="flex items-center justify-between gap-4">
                    <span className="text-sm text-slate-600">{shortcut.desc}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {shortcut.keys.map((key, k) => (
                        <kbd
                          key={k}
                          className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-xs font-mono text-slate-600 font-medium shadow-sm"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500">
            Appuyez sur <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono shadow-sm">Échap</kbd> pour fermer
          </p>
        </div>
      </div>
    </dialog>
  )
}
