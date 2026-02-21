import type { ModuleTemplate } from '../../types'

export const dep106: ModuleTemplate[] = [
  {
    id: 'sys-106-ep1-v1',
    name: '106 - Interroger, traiter et assurer la maintenance des bases de données (EP1)',
    description: 'Évaluation des prestations en deux parties avec deux travaux pratiques individuels. (Élément 1)',
    moduleNumber: '106',
    modulePrefix: 'I',
    testIdentifier: 'EP1',
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    objectives: [
      {
        id: 'sys-106-ep1-obj1',
        number: 1,
        title: 'Modifier ou migrer un schéma de base de données',
        description: 'Objectif opérationnel 106.6 : Modifier ou migrer un schéma de base de données et les données d’une base de données (DDL, contraintes, clés).',
        weight: 1
      },
      {
        id: 'sys-106-ep1-obj2',
        number: 2,
        title: 'Sauvegarde et restauration',
        description: 'Objectif opérationnel 106.5 : Effectuer une sauvegarde des données et du schéma de la base de données et les restaurer à partir du backup (Import/Export).',
        weight: 1
      },
      {
        id: 'sys-106-ep1-obj3',
        number: 3,
        title: 'Définir les autorisations d’accès',
        description: 'Objectif opérationnel 106.2 : Définir les autorisations d’accès (rôles/autorisations) selon le concept établi afin de garantir la sécurité et la protection des données.',
        weight: 1
      },
      {
        id: 'sys-106-ep1-obj4',
        number: 4,
        title: 'Concept de sécurité des données',
        description: 'Objectif opérationnel 106.1 : Élaborer un concept de sécurité des données et des rôles et le documenter.',
        weight: 1
      },
      {
        id: 'sys-106-ep1-obj5',
        number: 5,
        title: 'Optimiser la base de données',
        description: 'Objectif opérationnel 106.7 : Optimiser la base de données par rapport aux heures d’accès et aux besoins en ressources.',
        weight: 1
      }
    ]
  },
  {
    id: 'sys-106-ep2-v1',
    name: '106 - Interroger, traiter et assurer la maintenance des bases de données (EP2)',
    description: 'Évaluation des prestations en deux parties avec deux travaux pratiques individuels. (Élément 2)',
    moduleNumber: '106',
    modulePrefix: 'I',
    testIdentifier: 'EP2',
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    objectives: [
      {
        id: 'sys-106-ep2-obj1',
        number: 1,
        title: 'Modifier ou migrer un schéma de base de données',
        description: 'Objectif opérationnel 106.6 : Modifier ou migrer un schéma de base de données et les données d’une base de données (Import et adaptation).',
        weight: 1
      },
      {
        id: 'sys-106-ep2-obj2',
        number: 2,
        title: 'Interroger les données (Tables simples)',
        description: 'Objectif opérationnel 106.3 : Exécuter des commandes pour interroger les données et utiliser des fonctions de filtrage et d’agrégation (SELECT, WHERE, ORDER BY).',
        weight: 1
      },
      {
        id: 'sys-106-ep2-obj3',
        number: 3,
        title: 'Interroger les données (Tables multiples)',
        description: 'Objectif opérationnel 106.3 : Exécuter des commandes pour interroger les données sur plusieurs tables (JOIN).',
        weight: 1
      },
      {
        id: 'sys-106-ep2-obj4',
        number: 4,
        title: 'Interroger les données (Requêtes complexes)',
        description: 'Objectif opérationnel 106.3 : Exécuter des commandes pour interroger les données avec calculs (Sous-requêtes, fonctions d\'agrégation, GROUP BY, HAVING).',
        weight: 1
      },
      {
        id: 'sys-106-ep2-obj5',
        number: 5,
        title: 'Définir les autorisations d’accès',
        description: 'Objectif opérationnel 106.2 : Définir les autorisations d’accès (rôles/autorisations) selon le concept établi afin de garantir la sécurité et la protection des données.',
        weight: 1
      },
      {
        id: 'sys-106-ep2-obj6',
        number: 6,
        title: 'Utiliser des transactions',
        description: 'Objectif opérationnel 106.4 : Traiter des données et utiliser des transactions si nécessaire.',
        weight: 1
      }
    ]
  }
]
