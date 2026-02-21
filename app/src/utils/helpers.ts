import type { AcademicYear } from '../types'

export const uid = () => crypto.randomUUID()

export const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

export const detectAcademicYear = (date = new Date()): AcademicYear => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1

  if (month >= 8) {
    return { start: year, end: year + 1 }
  }

  return { start: year - 1, end: year }
}

export const toAcademicYearLabel = (year: AcademicYear) => `${year.start}-${year.end}`

export interface ThemeColors {
  primary: string // couleur primaire (700)
  primaryLight: string // couleur claire pour accents (100)
  primaryMuted: string // couleur semi-transparente pour backgrounds
  accent: string // couleur pour highlights (600)
  accentDark: string // couleur foncée pour states actifs (800)
  badge: string // couleur pour badges
  badgeBorder: string // bordure badge
  progress: string // couleur barre progression
  button: string // couleur boutons primaires
  buttonHover: string // hover boutons
}

export const getThemeColors = (testType: 'formatif' | 'sommatif'): ThemeColors => {
  if (testType === 'formatif') {
    // Vert calme et rassurant
    return {
      primary: 'emerald-700',
      primaryLight: 'emerald-50',
      primaryMuted: 'emerald-500/15',
      accent: 'emerald-600',
      accentDark: 'emerald-800',
      badge: 'emerald-100',
      badgeBorder: 'emerald-200',
      progress: 'from-emerald-500 to-emerald-400',
      button: 'emerald-600',
      buttonHover: 'emerald-700',
    }
  } else {
    // Orange abricot doux et chaleureux (sommatif)
    return {
      primary: 'orange-600',
      primaryLight: 'orange-50',
      primaryMuted: 'orange-500/15',
      accent: 'orange-500',
      accentDark: 'orange-700',
      badge: 'orange-100',
      badgeBorder: 'orange-200',
      progress: 'from-orange-500 to-amber-400',
      button: 'orange-600',
      buttonHover: 'orange-700',
    }
  }
}
export const parseProjectName = (name: string) => {
  const normalized = (name || '').trim()
  const parts = normalized.split('-').map(p => p.trim())
  
  let identificationModule = parts[0] || ''
  let trimestreAcademique = parts[1] || ''
  let groupeLabo = parts.slice(2).join('-') || ''

  let groupType = 'Autres'
  let groupWeight = 4
  
  const upperId = identificationModule.toUpperCase()
  if (upperId.startsWith('C')) {
    groupType = 'C'
    groupWeight = 1
  } else if (upperId.startsWith('I')) {
    groupType = 'I'
    groupWeight = 2
  } else if (/^\d+$/.test(upperId)) {
    groupType = 'Numérique'
    groupWeight = 3
  }

  return {
    identificationModule,
    trimestreAcademique,
    groupeLabo,
    groupType,
    groupWeight,
    originalName: name
  }
}

export const getModuleCardColors = (groupType: string) => {
  if (groupType === 'C') {
    return 'bg-blue-50 border-blue-200 hover:border-blue-300'
  }
  if (groupType === 'I') {
    return 'bg-emerald-50 border-emerald-200 hover:border-emerald-300'
  }
  if (groupType === 'Numérique') {
    return 'bg-amber-50 border-amber-200 hover:border-amber-300'
  }
  return 'bg-violet-50 border-violet-200 hover:border-violet-300'
}

export interface ModuleInfo {
  moduleNumber: string | null
  modulePrefix: 'I' | 'C' | null
  weightPercentage: number | null
}

/**
 * Parse le nom du projet pour extraire les infos du module
 * Format supporté :
 * - 164 → moduleNumber: "164", prefix: null
 * - I164 → moduleNumber: "164", prefix: "I", weight: 0.8 (École professionnelle)
 * - C164 → moduleNumber: "164", prefix: "C", weight: 0.2 (Cours interentreprises)
 * - Module 164 - Test formé → moduleNumber: "164", prefix: null
 * - I 164 - Description → moduleNumber: "164", prefix: "I"
 */
export const parseModuleInfo = (name: string): ModuleInfo => {
  if (!name) return { moduleNumber: null, modulePrefix: null, weightPercentage: null }

  // Cherche un pattern : [I|C]? suivi de 3 chiffres
  const match = name.match(/([IC]?\s*)?(\d{3})/)

  if (!match) {
    return { moduleNumber: null, modulePrefix: null, weightPercentage: null }
  }

  const prefixPart = match[1]?.trim() || null
  const moduleNumber = match[2]

  let modulePrefix: 'I' | 'C' | null = null
  let weightPercentage: number | null = null

  if (prefixPart === 'I') {
    modulePrefix = 'I'
    weightPercentage = 0.8 // 80% (École professionnelle)
  } else if (prefixPart === 'C') {
    modulePrefix = 'C'
    weightPercentage = 0.2 // 20% (Cours interentreprises)
  }

  return {
    moduleNumber,
    modulePrefix,
    weightPercentage,
  }
}