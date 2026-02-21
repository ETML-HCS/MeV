# Préparation de la mise à jour : Squelettes par défaut

## Objectif
Intégrer une liste de squelettes (templates de modules) par défaut dans l'application pour faciliter la création d'évaluations. Ces squelettes seront disponibles automatiquement pour tous les utilisateurs.

## Liste des modules à intégrer

### Modules de base
- 106 – Interroger, traiter et assurer la maintenance des bases de données
- 117 – Mettre en place l’infrastructure informatique et réseau d’une petite entreprise
- 122 – Automatiser des procédures à l’aide de scripts
- 123 – Activer les services d’un serveur
- 162 – Analyser et modéliser des données
- 164 – Créer des bases de données et y insérer des données
- 187 – Mettre en service un poste de travail ICT avec le système d’exploitation
- 216 – Intégrer les terminaux IoE dans une plateforme existante
- 231 – Appliquer la protection et la sécurité des données
- 319 – Concevoir et implémenter des applications
- 431 – Exécuter des mandats de manière autonome dans son propre environnement professionnel

### Modules avancés / Spécialisations
- 107 – Mettre en œuvre des solutions ICT avec la technologie blockchain
- 109 – Exploiter et surveiller des services dans le cloud public
- 114 – Mettre en œuvre des systèmes de codification, de compression et d’encryptage
- 129 – Mettre en service des composants réseaux
- 141 – Installer des systèmes de bases de données
- 143 – Implanter un système de sauvegarde et de restauration
- 158 – Planifier et exécuter la migration de logiciels
- 169 – Mettre à disposition des services avec des conteneurs
- 184 – Implémenter la sécurité réseau
- 188 – Exploiter, surveiller et assurer la maintenance des services
- 190 – Mettre en place et exploiter une plateforme de virtualisation
- 210 – Utiliser un cloud public pour des applications
- 248 – Réaliser des solutions ICT avec des technologies actuelles
- 254 – Décrire des processus métier dans son propre environnement professionnel
- 259 – Développer des solutions ICT avec le machine learning
- 346 – Concevoir et réaliser des solutions cloud

### Modules d'analyse, réseau et sécurité
- 110 – Analyser et représenter des données avec des outils
- 145 – Exploiter et étendre un réseau
- 159 – Configurer et synchroniser le service d’annuaire
- 185 – Analyser et implémenter des mesures visant à assurer la sécurité informatique des PME
- 217 – Concevoir, planifier et mettre en place un service pour l’IoE
- 223 – Réaliser des applications multi‑utilisateurs orientées objets
- 300 – Intégrer des services réseau multi‑plateformes
- 306 – Réaliser de petits projets dans son propre environnement professionnel
- 335 – Réaliser une application pour mobile

### Modules de planification et innovation
- 157 – Planifier et exécuter l’introduction d’un système informatique
- 182 – Implémenter la sécurité système
- 241 – Initialiser des solutions ICT innovantes
- 245 – Mettre en œuvre des solutions ICT innovantes

## Actions requises pour l'implémentation

1. **Création des données initiales (Seed)** :
   - Créer un fichier de configuration (ex: `src/data/default-module-templates.ts`) contenant la liste de ces modules sous forme d'objets `ModuleTemplate`.
   - Chaque objet devra inclure : `id`, `name` (ex: "106 – Interroger..."), `moduleNumber` (ex: "106"), `modulePrefix` (à définir si I ou C par défaut, ou laisser vide), et une structure `objectives` vide ou pré-remplie si disponible.

### Exemple de structure de données (Module 164)
Basé sur le plan de formation (DEP 164-3), voici comment structurer un squelette par défaut. Le module 164 comporte 2 éléments d'évaluation (EP1 et EP2) avec des objectifs opérationnels spécifiques.

```typescript
import { ModuleTemplate } from '../types'

export const defaultModuleTemplates: ModuleTemplate[] = [
  {
    id: 'template-164-ep1',
    name: '164 - Créer des bases de données et y insérer des données (EP1)',
    moduleNumber: '164',
    modulePrefix: 'I', // À confirmer selon le plan d'études
    testIdentifier: 'EP1',
    objectives: [
      {
        id: 'obj-164-1',
        number: 1,
        title: 'Interpréter un modèle de données',
        description: 'Objectif opérationnel 164.1 : Interpréter correctement la représentation d’un modèle de données logique relationnel.',
        weight: 1
      },
      {
        id: 'obj-164-2',
        number: 2,
        title: 'Implémenter un modèle de données',
        description: 'Objectif opérationnel 164.2 : Implémenter un modèle de données logique relationnel dans un SGBD relationnel.',
        weight: 1
      },
      {
        id: 'obj-164-3',
        number: 3,
        title: 'Garantir l’intégrité référentielle',
        description: 'Objectif opérationnel 164.3 : Garantir l’intégrité référentielle du schéma de base de données implémenté avec des conditions d’intégrité (contraintes).',
        weight: 1
      },
      {
        id: 'obj-164-4',
        number: 4,
        title: 'Manipulation de données (DML)',
        description: 'Objectifs opérationnels 164.4 & 164.7 : Insérer des données (DML) et corriger les données erronées et incomplètes.',
        weight: 1
      },
      {
        id: 'obj-164-6',
        number: 5,
        title: 'Vérifier les données',
        description: 'Objectif opérationnel 164.6 : Vérifier l’exhaustivité et l’exactitude des données insérées au moyen d’interrogations simples.',
        weight: 1
      }
    ]
  },
  {
    id: 'template-164-ep2',
    name: '164 - Créer des bases de données et y insérer des données (EP2)',
    moduleNumber: '164',
    modulePrefix: 'I',
    testIdentifier: 'EP2',
    objectives: [
      // ... Structure similaire pour l'Élément 2 (EP2) incluant l'objectif 164.5 (Migration/Import)
    ]
  }
]
```

2. **Injection au démarrage** :
   - Modifier la logique d'initialisation de la base de données (Dexie/SQLite) pour vérifier si ces squelettes existent déjà.
   - Si la base est vide ou si les squelettes par défaut sont manquants, les insérer automatiquement lors du premier lancement de l'application.

3. **Mise à jour de l'interface utilisateur** :
   - S'assurer que la vue "Squelettes" (`TemplatesView.tsx`) affiche clairement ces modèles par défaut (peut-être avec un badge "Système" ou "Défaut" pour les différencier des squelettes créés par l'utilisateur).
   - Empêcher la suppression ou la modification des métadonnées de base de ces squelettes système (ou permettre de les dupliquer pour les modifier).

4. **Tests** :
   - Ajouter des tests E2E pour vérifier que les squelettes par défaut sont bien chargés à l'ouverture d'une nouvelle session.
   - Vérifier que la création d'une évaluation (EP) à partir d'un de ces modules fonctionne correctement.