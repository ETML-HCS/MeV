import { useState, useEffect } from 'react'
import { exportDatabase, importDatabase, downloadBackup } from '../../lib/db'
import { useConfirm } from '../../hooks/useConfirm'
import { ConfirmDialog } from '../shared/ConfirmDialog'

const api = window.electronAPI

export const BackupSection = () => {
   const [backupStatus, setBackupStatus] = useState<'idle' | 'exporting' | 'importing' | 'success' | 'error'>('idle')
   const [backupMessage, setBackupMessage] = useState('')
   const [confirm, confirmDialogProps] = useConfirm()
   const [dbPath, setDbPath] = useState<string | null>(null)

   useEffect(() => {
      if (api?.getDatabasePath) {
         api.getDatabasePath().then((p: string) => setDbPath(p)).catch(() => {})
      }
   }, [])

   const handleExportBackup = async () => {
      try {
         setBackupStatus('exporting')
         setBackupMessage('Export en cours...')
         const jsonData = await exportDatabase()
         downloadBackup(jsonData)
         setBackupStatus('success')
         setBackupMessage('Sauvegarde téléchargée avec succès')
         setTimeout(() => {
            setBackupStatus('idle')
            setBackupMessage('')
         }, 3000)
      } catch (error) {
         setBackupStatus('error')
         setBackupMessage(`Erreur lors de l'export : ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
         setTimeout(() => {
            setBackupStatus('idle')
            setBackupMessage('')
         }, 5000)
      }
   }

   const handleImportBackup = async (merge: boolean = false) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json'
      input.onchange = async (e) => {
         const file = (e.target as HTMLInputElement).files?.[0]
         if (!file) return

         try {
            setBackupStatus('importing')
            setBackupMessage('Import en cours...')
            const text = await file.text()
            await importDatabase(text, { merge })
            setBackupStatus('success')
            setBackupMessage(merge ? 'Données fusionnées avec succès' : 'Données restaurées avec succès')
            setTimeout(() => {
               setBackupStatus('idle')
               setBackupMessage('')
               window.location.reload()
            }, 2000)
         } catch (error) {
            setBackupStatus('error')
            setBackupMessage(`Erreur lors de l'import : ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
            setTimeout(() => {
               setBackupStatus('idle')
               setBackupMessage('')
            }, 5000)
         }
      }
      input.click()
   }

   const handleRestoreBackup = async () => {
      const ok = await confirm({
         title: 'Restaurer les données',
         message: 'ATTENTION : Cette action remplacera toutes vos données actuelles par celles du fichier de sauvegarde.\n\nVoulez-vous continuer ?',
         confirmLabel: 'Restaurer',
         variant: 'danger',
      })
      if (ok) handleImportBackup(false)
   }

   const handleMergeBackup = async () => {
      const ok = await confirm({
         title: 'Fusionner les données',
         message: 'Cette action fusionnera les données du fichier avec vos données actuelles.\n\nContinuer ?',
         confirmLabel: 'Fusionner',
         variant: 'warning',
      })
      if (ok) handleImportBackup(true)
   }

   return (
      <>
         <div className="bg-linear-to-br from-white to-slate-50/30 rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-linear-to-r from-blue-600 to-blue-500 flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                     <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                     </svg>
                  </div>
                  <h3 className="text-sm font-bold text-white">Sauvegarde & Restauration</h3>
               </div>
               {backupStatus !== 'idle' && (
                  <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                     backupStatus === 'success' ? 'bg-green-500/20 text-green-100' :
                     backupStatus === 'error' ? 'bg-red-500/20 text-red-100' :
                     'bg-white/20 text-blue-100'
                  }`}>
                     {backupMessage}
                  </span>
               )}
            </div>
            <div className="px-6 py-5">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="relative group">
                     <button
                        onClick={handleExportBackup}
                        disabled={backupStatus !== 'idle'}
                        className="w-full px-4 py-2 bg-linear-to-r from-blue-600 to-blue-500 text-white text-sm font-semibold rounded-lg hover:from-blue-700 hover:to-blue-600 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                     >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span>Télécharger</span>
                     </button>
                     <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                        <div className="bg-slate-900 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-lg">
                           Crée une copie de sécurité de toutes vos données
                           <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                        </div>
                     </div>
                  </div>
                  <div className="relative group">
                     <button
                        onClick={handleRestoreBackup}
                        disabled={backupStatus !== 'idle'}
                        className="w-full px-4 py-2 bg-linear-to-r from-orange-600 to-orange-500 text-white text-sm font-semibold rounded-lg hover:from-orange-700 hover:to-orange-600 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                     >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        <span>Restaurer</span>
                     </button>
                     <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                        <div className="bg-slate-900 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-lg">
                           Remplace toutes les données actuelles
                           <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                        </div>
                     </div>
                  </div>
                  <div className="relative group">
                     <button
                        onClick={handleMergeBackup}
                        disabled={backupStatus !== 'idle'}
                        className="w-full px-4 py-2 bg-linear-to-r from-teal-600 to-teal-500 text-white text-sm font-semibold rounded-lg hover:from-teal-700 hover:to-teal-600 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                     >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        <span>Fusionner</span>
                     </button>
                     <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                        <div className="bg-slate-900 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-lg">
                           Ajoute les nouveaux projets sans supprimer
                           <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                        </div>
                     </div>
                  </div>
               </div>
            </div>
            {dbPath && (
               <div className="px-6 pb-4 pt-0">
                  <p className="text-[10px] text-slate-400 font-mono truncate" title={dbPath}>
                     📁 Base de données : {dbPath}
                  </p>
               </div>
            )}
         </div>
         <ConfirmDialog {...confirmDialogProps} />
      </>
   )
}
