# ETML - Module d'évaluation (Migration VBA → Web)

Application web offline-first pour remplacer la solution Excel VBA de grilles d'évaluation ETML.

## Stack

- React + TypeScript + Vite
- Tailwind CSS
- Zustand + React Query
- IndexedDB (Dexie)
- Import/Export Excel (SheetJS)
- PDF élève + ZIP batch (`@react-pdf/renderer`, JSZip)

## Installation

```bash
npm install
```

## Lancement

```bash
npm run dev
```

## Build production

```bash
npm run build
npm run preview
```

## Tests

- Unitaires (logique calcul notes/points):

```bash
npm run test
```

- E2E critique (chargement + navigation):

```bash
npm run test:e2e
```

## Migration des données Excel existantes

Script de conversion login workbook vers JSON:

```bash
npm run migrate:excel -- "C:/chemin/Logins_2025-2026.xlsx" "migration-output.json"
```

Le JSON produit contient:
- `students`: extrait du bloc A15:Bxx de la première feuille
- `logins`: extrait des onglets `*in*` (fin/cin/min)

## Fonctions implémentées (MVP)

- Dashboard avec année académique auto (règle août)
- Import logins Excel + édition manuelle login/groupe
- CRUD objectifs + indicateurs (max 20, duplication, réordonnancement, contrôle somme poids)
- Aperçu Grille Master (totaux objectif)
- Évaluation élève (scores 0-3, remarques, calcul points + note en temps réel, autosave)
- Synthèse classe (tableau croisé + heatmap) + exports Excel et ZIP de PDF individuels

## Structure

- `src/types`: contrats TypeScript métier
- `src/stores`: store Zustand global
- `src/lib`: calculs, Dexie, Excel, PDF
- `src/hooks`: hooks React Query (students/objectives/evaluation)
- `src/components`: vues métier (dashboard, élèves, objectifs, grille, évaluation, synthèse)
