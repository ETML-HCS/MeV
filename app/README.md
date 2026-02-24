# MeV - Module d'évaluation ETML

Application desktop de gestion et d'évaluation des modules pour l'ETML.  
Solution moderne Electron, offline-first, conçue pour remplacer l'ancienne solution Excel VBA de grilles d'évaluation.

## 🚀 Stack technique

### Frontend
- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** pour le style
- **Zustand** + **React Query** pour la gestion d'état
- **@react-pdf/renderer** pour génération PDF
- **SheetJS** (xlsx) pour import/export Excel

### Backend / Desktop
- **Electron** (architecture multi-process)
- **SQLite** (better-sqlite3) avec mode WAL
- **Node.js** pour IPC handlers
- **Microsoft Teams OAuth** (MSAL) pour authentification SSO

### Persistance
- **Architecture hybride** : mémoire (session) + SQLite (permanent)
- **Migration automatique** des anciennes bases de données
- **Backup/Restore** avec export JSON et ZIP

---

## 📦 Installation

```bash
npm install
```

---

## 🛠️ Développement

### Mode web (Vite dev server)
```bash
npm run dev
```
Interface accessible sur `http://localhost:5273`  
⚠️ Utilise IndexedDB (fallback) au lieu de SQLite

### Mode Electron (application desktop)
```bash
npm run dev:electron
```
Lance Vite + Electron avec hot-reload complet  
✅ Utilise SQLite pour la persistance

---

## 📦 Build & Distribution

### Build web
```bash
npm run build
npm run preview
```

### Build Electron (Windows)
```bash
npm run build:win
```
Génère l'installateur `.exe` dans `release/`

### Build multi-plateformes
```bash
npm run build:electron    # Auto-détecte la plateforme
npm run build:mac         # macOS
npm run build:linux       # Linux
```

---

## 🧪 Tests

### Tests unitaires
```bash
npm run test          # Run once
npm run test:watch    # Watch mode
```
Teste la logique de calcul (notes, points, pondérations)

### Tests E2E
```bash
npm run test:e2e
```
Teste les flux critiques avec Playwright

---

## 💾 Architecture de sauvegarde

### Système hybride

MeV utilise une **architecture à deux niveaux** pour optimiser performances et fiabilité :

```
┌─────────────────────────────────────────┐
│         React UI (renderer)              │
│  • Hooks React Query                     │
│  • Zustand stores (état UI)              │
└──────────────┬──────────────────────────┘
               │ IPC (electronAPI)
┌──────────────▼──────────────────────────┐
│      Electron Main Process               │
│  ┌─────────────────────────────────┐    │
│  │ memoryStore (RAM - session)     │    │
│  │ • students: Map<id, Student>    │    │
│  │ • objectives: Map<id, Objective>│    │
│  │ • grids: Map<id, StudentGrid>   │    │
│  └──────────────┬──────────────────┘    │
│                 │ Flush automatique      │
│  ┌──────────────▼──────────────────┐    │
│  │ SQLite (persistent storage)     │    │
│  │ %APPDATA%/MeV/                  │    │
│  │ mev-evaluation.sqlite           │    │
│  └─────────────────────────────────┘    │
└──────────────────────────────────────────┘
```

### Stratégie de persistance

#### 1. **Session active** (mémoire)
- Données chargées en RAM au démarrage d'un projet
- Opérations ultra-rapides (lecture/écriture instantanée)
- Pas de latence réseau ou I/O disque

#### 2. **Sauvegarde immédiate** (SQLite)
- Chaque modification de grille → sauvegardée **instantanément** en base
- Fonction `saveGridToProject()` appelée à chaque changement
- Protection contre les crashes ou fermetures inattendues

#### 3. **Flush global** (synchronisation)
- Appelé lors du changement de projet ou fermeture
- Synchronise students, objectives, grids en une transaction
- Fonction `flushMemoryToDatabase()`

### Localisation des données

**Windows** :  
`C:\Users\[username]\AppData\Roaming\MeV\mev-evaluation.sqlite`

**Migration automatique** :  
Si vous renommez l'application (ex: MEV → MeV), la base est automatiquement détectée et migrée.

### Schéma SQLite

```sql
-- Configuration globale
settings (key, value)

-- Projets d'évaluation
projects (
  id, name, description,
  moduleNumber, modulePrefix, weightPercentage,
  settings JSON,    -- Paramètres spécifiques au projet
  students JSON,    -- Array d'élèves
  objectives JSON,  -- Array d'objectifs
  grids JSON        -- Grilles d'évaluation
)

-- Gestion utilisateurs
users (id, name, initials, color, createdAt, lastLogin)
user_evaluations (userId, projectId, lastOpenedAt)
```

### Backup & Restore

#### Export global
```bash
Dashboard → Sauvegarde → Exporter tout
```
Génère `MeV-backup-YYYY-MM-DD.json` avec tous les projets

#### Export projet individuel
```bash
Projets → ⋮ → Exporter
```
Génère `MeV_[nom-projet]_YYYY-MM-DD.json`

#### Export ZIP (tous projets)
```bash
Projets → Tout sauver
```
Génère `MeV_BACKUP_ALL_YYYY-MM-DD.zip` (1 JSON par projet)

#### Import
```bash
Dashboard → Sauvegarde → Importer
```
- **Mode fusion** : conserve les projets existants
- **Mode écrasement** : remplace toute la base

---

## 🎯 Fonctionnalités

### Gestion de projets
- ✅ Création/édition/suppression de projets d'évaluation
- ✅ Duplication de projets (templates)
- ✅ Organisation par module (ex: I107, C216)
- ✅ Pondération automatique (I = 80%, C = 20%)

### Élèves
- ✅ Import Excel (fichiers logins ETML)
- ✅ Import Teams (SSO Microsoft + récupération groupes)
- ✅ Édition manuelle (nom, prénom, login, groupe labo)
- ✅ Tri et recherche

### Objectifs & Indicateurs
- ✅ CRUD complet avec taxonomie Bloom
- ✅ Jusqu'à 20 indicateurs par objectif
- ✅ Duplication et réordonnancement (drag & drop)
- ✅ Validation automatique somme des poids (= 100%)
- ✅ Calcul automatique des points max

### Évaluation
- ✅ Grille par élève avec scores 0-3
- ✅ Calcul temps réel (points, note finale)
- ✅ Mode focus (navigation clavier)
- ✅ Remarques textuelles par indicateur
- ✅ Statut complété/incomplet
- ✅ **Autosave** : chaque modification sauvegardée instantanément
- ✅ Date alternative par grille

### Synthèse & Exports
- ✅ Tableau croisé élèves × objectifs
- ✅ Heatmap visuelle des résultats
- ✅ Statistiques classe (moyenne, médiane, min, max)
- ✅ Export Excel global
- ✅ PDF individuels avec en-tête personnalisé
- ✅ ZIP batch (tous les PDF en un clic)

### Dashboard
- ✅ Année académique auto-détectée (bascule en août)
- ✅ Import rapide élèves/objectifs
- ✅ Backup/Restore complet
- ✅ Profil utilisateur multi-comptes

---

## 📁 Structure du projet

```
app/
├── electron/              # Code Node.js (main process)
│   ├── main.ts           # Point d'entrée Electron
│   ├── preload.ts        # Bridge IPC sécurisé
│   ├── database.ts       # Opérations SQLite
│   ├── ipc-handlers.ts   # Gestionnaires IPC
│   └── teams-service.ts  # OAuth Microsoft Teams
│
├── src/                  # Code React (renderer process)
│   ├── components/       # Composants UI
│   │   ├── dashboard/   
│   │   ├── students/    
│   │   ├── objectives/  
│   │   ├── evaluation/  
│   │   ├── synthesis/   
│   │   ├── grades/      # Notes par groupes labo
│   │   └── layout/      
│   │
│   ├── hooks/            # Hooks React Query
│   │   ├── useStudents.ts
│   │   ├── useObjectives.ts
│   │   └── useEvaluation.ts
│   │
│   ├── lib/              # Logique métier
│   │   ├── db.ts         # API base de données
│   │   ├── calculations.ts
│   │   ├── pdf-generator.tsx
│   │   └── excel-utils.ts
│   │
│   ├── stores/           # État global Zustand
│   │   ├── useAppStore.ts
│   │   └── useUserStore.ts
│   │
│   ├── types/            # Interfaces TypeScript
│   │   └── index.ts
│   │
│   └── utils/            # Utilitaires
│       ├── constants.ts
│       ├── helpers.ts
│       └── taxonomy.ts   # Niveaux Bloom
│
├── public/               # Assets statiques
├── scripts/              # Scripts migration
└── tests/                # Tests E2E Playwright
```

---

## 🔧 Migration Excel

Script de conversion des fichiers logins Excel vers JSON :

```bash
npm run migrate:excel -- "C:/chemin/Logins_2025-2026.xlsx" "output.json"
```

Le JSON généré contient :
- `students` : extrait du bloc A15:Bxx (première feuille)
- `logins` : extrait des onglets `*in*` (fin/cin/min)

---

## 📄 Licence

Application propriétaire ETML - Usage interne uniquement
