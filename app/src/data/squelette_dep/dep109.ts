import type { ModuleTemplate } from '../../types';

export const dep109: ModuleTemplate[] = [
  {
    id: 'sys-109-ep2-v1',
    name: 'Module 109 - Exploiter et surveiller des services dans le cloud public',
    description: 'Squelette système pour le module 109 (EP2)',
    moduleNumber: '109',
    modulePrefix: 'I',
    testIdentifier: 'EP2',
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    objectives: [
      {
        id: 'sys-109-ep2-obj-1',
        number: 109.1,
        title: 'Définir une solution cloud (architecture simple) adaptée aux objectifs de l’entreprise au moyen d’une application d’exemple.',
        description: '',
        weight: 1
      },
      {
        id: 'sys-109-ep2-obj-2',
        number: 109.2,
        title: 'Évaluer le concept de sécurité donné (utilisateurs, rôles, accès, auditing, chiffrement, responsabilités [Shared Responsability]) au moyen de l’application d’exemple.',
        description: '',
        weight: 1
      },
      {
        id: 'sys-109-ep2-obj-3',
        number: 109.3,
        title: 'Mettre à disposition l’application d’exemple à l’aide de technologies virtuelles de serveur et/ou de conteneur avec un service de base de données (service de plateforme).',
        description: '',
        weight: 1
      },
      {
        id: 'sys-109-ep2-obj-4',
        number: 109.4,
        title: 'Implémenter, selon les consignes, la surveillance et la gestion de l’infrastructure (monitorage, logging, alertes, gestion à distance, correctifs et scalabilité).',
        description: '',
        weight: 1
      },
      {
        id: 'sys-109-ep2-obj-5',
        number: 109.5,
        title: 'Implémenter, selon les consignes, la sauvegarde des données (reprise après sinistre/backup) de l’application d’exemple avec base de données.',
        description: '',
        weight: 1
      }
    ]
  }
];
