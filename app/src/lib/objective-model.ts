import type { Objective } from '../types'
import { uid } from '../utils/helpers'

export const createObjectiveModelTemplates = (): Objective[] => [
  {
    id: uid(),
    number: 1,
    title: 'Organisation du travail',
    description: 'Planifie et exécute les tâches demandées',
    weight: 1,
    indicators: [
      {
        id: uid(),
        taxonomy: 'Appliquer',
        behavior: 'Prépare son poste correctement',
        weight: 0.5,
        conditions: 'Validation poste en autonomie',
        expectedResults: 'Checklist poste validée',
        remarks: { 0: 'Non acquis', 1: 'Partiel', 2: 'Acquis', 3: 'Très bien' },
      },
      {
        id: uid(),
        taxonomy: 'Appliquer',
        behavior: 'Respecte les étapes de production',
        weight: 0.5,
        conditions: 'Exécution complète du flux',
        expectedResults: 'Processus suivi sans oubli',
        remarks: { 0: 'Non acquis', 1: 'Partiel', 2: 'Acquis', 3: 'Très bien' },
      },
    ],
  },
  {
    id: uid(),
    number: 2,
    title: 'Qualité et sécurité',
    description: 'Applique les règles qualité/sécurité',
    weight: 1,
    indicators: [
      {
        id: uid(),
        taxonomy: 'Appliquer',
        behavior: 'Applique les consignes de sécurité',
        weight: 0.5,
        conditions: 'Travail en atelier',
        expectedResults: 'EPI utilisés et règles respectées',
        remarks: { 0: 'Non acquis', 1: 'Partiel', 2: 'Acquis', 3: 'Très bien' },
      },
      {
        id: uid(),
        taxonomy: 'Appliquer',
        behavior: 'Livre un résultat conforme',
        weight: 0.5,
        conditions: 'Contrôle qualité final',
        expectedResults: 'Tolérances et qualité conformes',
        remarks: { 0: 'Non acquis', 1: 'Partiel', 2: 'Acquis', 3: 'Très bien' },
      },
    ],
  },
]
