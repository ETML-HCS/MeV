import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { AppTab, EvaluationProject } from '../../types'
import { parseProjectName } from '../../utils/helpers'

interface AppLayoutProps {
   activeTab: AppTab
   testType: 'formatif' | 'sommatif'
   onTabChange: (tab: AppTab) => void
   evaluationProgress?: {
      completed: number
      total: number
   }
   tabAccess?: Partial<Record<AppTab, boolean>>
   onReturnToProjects?: () => void
   exportSection?: {
      visible: boolean
      onExportPdf: () => void
      onExportWebJson: () => void
   }
   profileBadge?: ReactNode
   onOpenPseudo?: () => void
   onOpenMasterGrid?: () => void
   onOpenBackup?: () => void
   canOpenPseudo?: boolean
   canOpenMasterGrid?: boolean
   moduleProjects?: EvaluationProject[]
   activeProjectId?: string | null
   onSelectProject?: (projectId: string) => void
   children: ReactNode
}

const tabs: { id: AppTab; label: string; step: number; desc: string }[] = [
   { id: 'dashboard', label: 'Dashboard', step: 1, desc: 'Configuration du test' },
   { id: 'students', label: 'Élèves', step: 2, desc: 'Gestion des logins' },
   { id: 'objectives', label: 'Objectifs', step: 3, desc: 'Critères d\'évaluation' },
   { id: 'master-grid', label: 'Grille Master', step: 4, desc: 'Grille de référence' },
   { id: 'evaluation', label: 'Évaluation', step: 5, desc: 'Saisie des notes' },
   { id: 'synthesis', label: 'Synthèse', step: 6, desc: 'Résultats & export' },
]

// Workflow principal (sans les onglets secondaires)
// const workflowTabs = tabs.filter((tab) => tab.id !== 'students' && tab.id !== 'master-grid')

// Renommer et améliorer les labels du workflow
const workflowTabsEnhanced = [
   { id: 'dashboard' as AppTab, label: '1. Configuration', desc: 'Infos du test', icon: '⚙️' },
   { id: 'objectives' as AppTab, label: '2. Objectifs', desc: 'Critères d\'évaluation', icon: '🎯' },
   { id: 'evaluation' as AppTab, label: '3. Évaluations', desc: 'Notation des élèves', icon: '✏️' },
   { id: 'synthesis' as AppTab, label: '4. Synthèse', desc: 'Résultats & export', icon: '📊' },
]

export const AppLayout = ({
   activeTab,
   testType,
   onTabChange,
   evaluationProgress,
   tabAccess,
   onReturnToProjects,
   exportSection,
   profileBadge,
   onOpenPseudo,
   onOpenMasterGrid,
   onOpenBackup,
   canOpenPseudo,
   canOpenMasterGrid,
   moduleProjects = [],
   activeProjectId,
   onSelectProject,
   children,
}: AppLayoutProps) => {
   const [activeMenuId, setActiveMenuId] = useState<AppTab | null>(null)
   const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)
   const menuRef = useRef<HTMLDivElement>(null)
   const menuButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({})

   // Close menu when clicking outside (both the dropdown and the ⋮ button)
   useEffect(() => {
      if (!activeMenuId) return
      const handleMouseDown = (e: MouseEvent) => {
         const target = e.target as Node
         // Ignore clicks inside the dropdown menu itself
         if (menuRef.current?.contains(target)) return
         // Ignore clicks on any ⋮ button
         for (const btn of Object.values(menuButtonRefs.current)) {
            if (btn?.contains(target)) return
         }
         setActiveMenuId(null)
         setMenuPosition(null)
      }
      document.addEventListener('mousedown', handleMouseDown)
      return () => document.removeEventListener('mousedown', handleMouseDown)
   }, [activeMenuId])

   const toggleMenu = (tabId: AppTab, button: HTMLButtonElement) => {
      if (activeMenuId === tabId) {
         setActiveMenuId(null)
         setMenuPosition(null)
      } else {
         const rect = button.getBoundingClientRect()
         setActiveMenuId(tabId)
         setMenuPosition({ top: rect.top, left: rect.right + 8 })
      }
   }
   const activeIndex = workflowTabsEnhanced.findIndex(t => t.id === activeTab)
   const activeTabMeta = workflowTabsEnhanced.find(t => t.id === activeTab) || tabs.find(t => t.id === activeTab)

   const activeProject = moduleProjects.find(p => p.id === activeProjectId)
   const parsedModule = activeProject ? parseProjectName(activeProject.name) : null

   const getModuleBadgeColor = (type: string) => {
      switch (type) {
         case 'C': return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
         case 'I': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
         case 'Numérique': return 'bg-amber-500/20 text-amber-300 border-amber-500/30'
         default: return 'bg-violet-500/20 text-violet-300 border-violet-500/30'
      }
   }

   return (
      <div className="flex h-screen bg-slate-100">
         {/* SIDEBAR */}
         <aside className="w-60 bg-slate-900 flex flex-col shadow-2xl shrink-0">
            {/* Logo */}
            <div className="px-5 pt-5 pb-4">
               <div className="flex items-center gap-3">
                  <img src="./favicon.jpg" alt="MeV Logo" className="w-9 h-9 rounded-lg shadow-lg" />
                  <div>
                     <h1 className="font-bold text-base text-white tracking-tight leading-none">
                        <span style={{ fontFamily: 'ETML L, sans-serif' }}>ETML</span> / CFPV
                     </h1>
                     <p className="text-[11px] text-slate-400 font-medium mt-0.5">Module d'évaluation</p>
                  </div>
               </div>
            </div>

            {/* Divider */}
            <div className="mx-5 h-px bg-slate-700/50" />

            {/* Workflow Steps */}
            <nav className="flex-1 px-3 py-4 flex flex-col" aria-label="Navigation principale">
               <div className="flex items-center justify-between px-3 mb-3">
                  <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                     Workflow
                  </div>
                  {parsedModule && (
                     <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${getModuleBadgeColor(parsedModule.groupType)}`} title={`Type: ${parsedModule.groupType}`}>
                           {parsedModule.identificationModule}
                        </span>
                        {parsedModule.groupeLabo && (
                           <span className="text-[10px] font-medium text-slate-400 truncate max-w-20" title={`Groupe: ${parsedModule.groupeLabo}`}>
                              {parsedModule.groupeLabo}
                           </span>
                        )}
                     </div>
                  )}
               </div>

               {/* Module Tabs (EP1, EP2, etc.) */}
               {moduleProjects.length > 0 && (
                  <div className="px-3 mb-4 flex gap-1 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                     {moduleProjects.map(project => {
                        const isProjectActive = project.id === activeProjectId
                        const epName = project.settings.testIdentifier || 'EP?'
                        return (
                           <button
                              key={project.id}
                              onClick={() => onSelectProject?.(project.id)}
                              className={`
                                 shrink-0 px-2.5 py-1 text-[10px] font-bold rounded-md transition-all
                                 ${isProjectActive 
                                    ? 'bg-slate-700 text-white shadow-sm' 
                                    : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-slate-300'
                                 }
                              `}
                           >
                              {epName}
                           </button>
                        )
                     })}
                  </div>
               )}

               <div className="space-y-0.5 overflow-y-auto flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {workflowTabsEnhanced.map((tab, index) => {
                     const isActive = activeTab === tab.id
                     const isEnabled = tabAccess?.[tab.id] ?? true
                     const isPast = index < activeIndex
                     const isNext = index === activeIndex + 1
                     const hasQuickMenu = tab.id === 'dashboard' || tab.id === 'evaluation'

                     return (
                        <div key={tab.id} className="relative">
                           {/* Row: tab label + optional ⋮ button side by side */}
                           <div className="flex items-center">
                              {/* Tab clickable area */}
                              <div
                                 role="button"
                                 tabIndex={0}
                                 onClick={() => isEnabled && onTabChange(tab.id)}
                                 onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                       e.preventDefault()
                                       if (isEnabled) onTabChange(tab.id)
                                    }
                                 }}
                                 title={!isEnabled ? 'Étape précédente requise' : undefined}
                                 className={`
                                    flex-1 min-w-0 flex items-center gap-2 px-3 py-2.5 text-left
                                    transition-all duration-200 cursor-pointer
                                    ${hasQuickMenu ? 'rounded-l-lg' : 'rounded-lg'}
                                    ${isActive
                                       ? testType === 'formatif'
                                          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                                          : 'bg-orange-600 text-white shadow-lg shadow-orange-600/30'
                                       : isEnabled
                                          ? isPast
                                             ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                             : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                                          : 'text-slate-600 cursor-not-allowed'
                                    }
                                 `}
                                 aria-current={isActive ? 'page' : undefined}
                              >
                                 {/* Step Number */}
                                 <span className={`
                                    shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold transition-all
                                    ${isActive
                                       ? 'bg-white/20 text-white'
                                       : isPast && isEnabled
                                          ? 'bg-emerald-500/20 text-emerald-400'
                                          : isEnabled
                                             ? 'bg-slate-700 text-slate-400'
                                             : 'bg-slate-800 text-slate-700'
                                    }
                                 `}>
                                    {isPast && isEnabled ? '✓' : index + 1}
                                 </span>

                                 <div className="flex-1 min-w-0">
                                    <div className={`text-[13px] font-semibold leading-tight truncate ${isActive ? 'text-white' : ''
                                       }`}>
                                       {tab.label}
                                    </div>
                                    <div className={`text-[10px] mt-0.5 truncate ${isActive ? 'text-blue-200' : 'text-slate-500'
                                       }`}>
                                       {tab.id === 'evaluation' && evaluationProgress
                                          ? `${evaluationProgress.completed}/${evaluationProgress.total} élèves`
                                          : tab.desc}
                                    </div>
                                 </div>

                                 {isActive && !hasQuickMenu && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-white shadow-sm shrink-0" />
                                 )}

                                 {isNext && isEnabled && !isActive && (
                                    <span className="text-[10px] text-blue-400 font-medium shrink-0">→</span>
                                 )}
                              </div>

                              {/* ⋮ button — OUTSIDE the tab click area */}
                              {hasQuickMenu && (
                                 <button
                                    type="button"
                                    ref={(el) => { menuButtonRefs.current[tab.id] = el }}
                                    onClick={(e) => toggleMenu(tab.id, e.currentTarget)}
                                    className={`
                                       shrink-0 w-8 h-full flex items-center justify-center text-sm rounded-r-lg transition-all
                                       ${isActive
                                          ? testType === 'formatif'
                                             ? 'bg-emerald-700 text-emerald-200 hover:bg-emerald-800 hover:text-white'
                                             : 'bg-orange-700 text-orange-200 hover:bg-orange-800 hover:text-white'
                                          : 'bg-slate-800 text-slate-500 hover:bg-slate-700 hover:text-slate-300'
                                       }
                                    `}
                                    title="Menu rapide"
                                 >
                                    ⋮
                                 </button>
                              )}
                           </div>

                           {/* Quick Access Dropdown Menus rendered outside overflow container below */}
                        </div>
                     )
                  })}
               </div>

               {/* Quick Access Dropdown Menus — rendered OUTSIDE the overflow container */}
               {activeMenuId === 'dashboard' && menuPosition && (
                  <div
                     ref={menuRef}
                     className="w-56 bg-white border border-slate-200 rounded-lg shadow-lg"
                     style={{ position: 'fixed', top: menuPosition.top, left: menuPosition.left, zIndex: 9999 }}
                  >
                     <button
                        onClick={() => {
                           onOpenBackup?.()
                           setActiveMenuId(null)
                           setMenuPosition(null)
                        }}
                        className="w-full text-left px-4 py-2.5 text-slate-700 text-sm font-medium hover:bg-blue-50 hover:text-blue-700 transition-all flex items-center gap-2 rounded-lg"
                     >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                        </svg>
                        Sauvegarde & Restauration
                     </button>
                  </div>
               )}

               {activeMenuId === 'evaluation' && menuPosition && (
                  <div
                     ref={menuRef}
                     className="w-44 bg-white border border-slate-200 rounded-lg shadow-lg"
                     style={{ position: 'fixed', top: menuPosition.top, left: menuPosition.left, zIndex: 9999 }}
                  >
                     <button
                        onClick={() => {
                           onOpenPseudo?.()
                           setActiveMenuId(null)
                           setMenuPosition(null)
                        }}
                        disabled={!canOpenPseudo}
                        className="w-full text-left px-4 py-2.5 text-slate-700 text-sm font-medium hover:bg-blue-50 hover:text-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-slate-700 flex items-center gap-2 border-b border-slate-100 rounded-t-lg"
                     >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        Pseudo
                     </button>
                     <button
                        onClick={() => {
                           onOpenMasterGrid?.()
                           setActiveMenuId(null)
                           setMenuPosition(null)
                        }}
                        disabled={!canOpenMasterGrid}
                        className="w-full text-left px-4 py-2.5 text-slate-700 text-sm font-medium hover:bg-blue-50 hover:text-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-slate-700 flex items-center gap-2 rounded-b-lg"
                     >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                        Grille Master
                     </button>
                  </div>
               )}
            </nav>

            {/* Progress */}
            <div className="px-5 pb-5">
               {evaluationProgress && (
                  <div className="bg-slate-800 rounded-lg p-3 mb-4 border border-slate-700/50">
                     <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Évaluations</span>
                        <span className="text-[11px] font-bold text-white">
                           {evaluationProgress.completed} / {evaluationProgress.total}
                        </span>
                     </div>
                     <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                           className={`h-full rounded-full transition-all duration-500 ${
                              evaluationProgress.completed === evaluationProgress.total
                                 ? 'bg-emerald-500'
                                 : 'bg-blue-500'
                           }`}
                           style={{ width: `${evaluationProgress.total > 0 ? (evaluationProgress.completed / evaluationProgress.total) * 100 : 0}%` }}
                        />
                     </div>
                     <div className="mt-1.5 text-[9px] text-slate-500 text-right">
                        {evaluationProgress.total > 0 ? Math.round((evaluationProgress.completed / evaluationProgress.total) * 100) : 0}% complété
                     </div>
                  </div>
               )}

               <div className="bg-slate-800 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                     <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Progression</span>
                     <span className="text-[11px] font-bold text-slate-300">
                        {activeIndex >= 0 ? activeIndex + 1 : 1}/{workflowTabsEnhanced.length}
                     </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                     <div
                        className={`h-full rounded-full transition-all duration-500 ${testType === 'formatif'
                              ? 'bg-linear-to-r from-emerald-500 to-emerald-400'
                              : 'bg-linear-to-r from-orange-500 to-amber-400'
                           }`}
                        style={{ width: `${((activeIndex >= 0 ? activeIndex + 1 : 1) / workflowTabsEnhanced.length) * 100}%` }}
                     />
                  </div>
               </div>

               {exportSection?.visible && (
                  <div className="mt-4 bg-slate-800 rounded-lg p-3 border border-slate-700/70">
                     <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                        Exportations
                     </div>
                     <div className="space-y-2">
                        <button
                           onClick={exportSection.onExportPdf}
                           className="w-full py-2 px-3 rounded-md text-left text-xs font-semibold bg-rose-500/15 border border-rose-400/30 text-rose-200 hover:bg-rose-500/25 transition-all"
                        >
                           Export PDF (ZIP)
                        </button>
                        <button
                           onClick={exportSection.onExportWebJson}
                           className="w-full py-2 px-3 rounded-md text-left text-xs font-semibold bg-blue-500/15 border border-blue-400/30 text-blue-200 hover:bg-blue-500/25 transition-all"
                        >
                           Export WEB (JSON)
                        </button>
                     </div>
                  </div>
               )}
            </div>
         </aside>

         {/* MAIN */}
         <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Top Bar */}
            <header className="h-14 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
               <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-slate-900">
                     {activeTabMeta?.label}
                  </h2>
                  <span className="text-xs text-slate-400 hidden sm:inline">
                     — {activeTabMeta?.desc}
                  </span>
               </div>

               <div className="flex items-center gap-3">
                  {onReturnToProjects && (
                     <button
                        onClick={onReturnToProjects}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200 transition-all"
                     >
                        ← Retour au menu
                     </button>
                  )}
                  {profileBadge && (
                     <div className="border-l border-slate-200 pl-3">
                        {profileBadge}
                     </div>
                  )}
               </div>
            </header>

            {/* Content */}
            <main className="flex-1 overflow-auto">
               <div className="max-w-7xl mx-auto p-6 lg:p-8">
                  {children}
               </div>
            </main>
         </div>
      </div>
   )
}