# MEV - Module Évaluation (Version Electron)

## 🎯 Version Desktop avec SQLite

Cette application est maintenant une application de bureau cross-platform utilisant **Electron** et **SQLite** pour le stockage des données.

## 🚀 Démarrage Rapide

### Développement

```bash
npm run dev:electron
```

Cela va:
1. Démarrer Vite en mode développement
2. Lancer Electron qui charge l'application
3. Ouvrir les DevTools automatiquement

### Build Production

```bash
# Build pour Windows
npm run build:win

# Build pour macOS  
npm run build:mac

# Build pour Linux
npm run build:linux

# Build pour toutes les plateformes
npm run build:electron
```

## 📁 Structure du Projet

```
app/
├── src/                    # Code React (frontend)
├── electron/              # Code Electron (backend)
│   ├── main.ts           # Process principal
│   ├── preload.ts        # Pont sécurisé (IPC)
│   ├── database.ts       # Opérations SQLite
│   └── ipc-handlers.ts   # Handlers IPC
├── dist/                  # Build Vite (production)
├── dist-electron/         # Build Electron (production)
└── release/              # Installeurs (.exe, .dmg, .AppImage)
```

## 💾 Base de Données

### Emplacement SQLite

**Windows**: `%APPDATA%\mev-evaluation\mev-evaluation.sqlite`  
**macOS**: `~/Library/Application Support/mev-evaluation/mev-evaluation.sqlite`  
**Linux**: `~/.config/mev-evaluation/mev-evaluation.sqlite`

### Migration depuis IndexedDB

Si vous utilisiez l'ancienne version web:

1. **Version web** → Dashboard → "Télécharger sauvegarde" (fichier JSON)
2. **Version Electron** → Dashboard → "Restaurer" → Sélectionner le fichier JSON

✅ Toutes vos données seront migrées automatiquement !

## 🔧 Commandes Disponibles

| Commande | Description |
|----------|-------------|
| `npm run dev:electron` | Développement avec hot-reload |
| `npm run build` | Build de l'application React |
| `npm run build:electron` | Build complet + installeur |
| `npm run build:win` | Build Windows (.exe) |
| `npm run build:mac` | Build macOS (.dmg) |
| `npm run build:linux` | Build Linux (.AppImage, .deb) |

## 🌟 Nouveautés Electron

### Avantages

✅ **SQLite natif** - Plus rapide que IndexedDB  
✅ **Pas de limite de stockage** - Gérez autant de projets que vous voulez  
✅ **Application standalone** - Pas besoin de navigateur  
✅ **Sauvegarde facile** - Un seul fichier .sqlite  
✅ **Cross-platform** - Windows, macOS, Linux  
✅ **Icône sur le bureau** - Lancez directement l'app  

### Fonctionnalités Préservées

✅ Tous les projets et évaluations  
✅ Import/Export JSON  
✅ Multi-projets avec modules I/C  
✅ Séquences EP1, EP2, EP3  
✅ Sélection de questions (13/16)  
✅ Objectifs ICT  
✅ Système de notes  
✅ Backup & Restore  

## 🔐 Sécurité

- **Context Isolation**: Activé (sandbox)
- **Node Integration**: Désactivé
- **IPC sécurisé**: Communication via `contextBridge`
- **Pas d'accès direct**: Le renderer ne peut pas accéder au système de fichiers directement

## 📦 Distribution

Les installeurs sont créés dans le dossier `release/`:

- **Windows**: `MEV - Module Évaluation Setup 1.0.0.exe`
- **macOS**: `MEV - Module Évaluation-1.0.0.dmg`
- **Linux**: `mev-evaluation-1.0.0.AppImage` et `.deb`

## 🐛 Debug

- DevTools sont ouverts automatiquement en mode dev
- Logs du main process: visible dans le terminal
- Logs du renderer: visible dans les DevTools

## 📝 Notes Techniques

- **Electron**: v40.4.1
- **SQLite**: via better-sqlite3 v12.6.2
- **React**: v19.2.0
- **Vite**: v7.3.1
- **TypeScript**: v5.9.3

## ❓ Support

En cas de problème:
1. Vérifier que tous les `npm install` sont OK
2. Supprimer `node_modules` et `package-lock.json`, puis `npm install`
3. Vérifier les logs dans le terminal et les DevTools

## 🎓 Pour les Enseignants

Cette application est maintenant **installable sur vos machines** et **fonctionne hors ligne**. Vos données de correction restent **locales et privées**.

Recommandation: **Sauvegardez régulièrement** votre fichier SQLite ou utilisez les exports JSON pour backups sur OneDrive/réseau.
