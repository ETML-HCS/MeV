# 🚀 Guide de Démarrage Rapide - Version Electron

## ✅ Installation Terminée !

Votre application a été convertie avec succès en application desktop Electron avec SQLite.

## 📋 Prochaines Étapes

### 1. Tester en mode développement

```bash
npm run dev:electron
```

Cela va :
- ✅ Démarrer le serveur Vite
- ✅ Lancer Electron
- ✅ Ouvrir votre application dans une fenêtre native
- ✅ Activer les DevTools

### 2. Migrer vos données existantes

Si vous aviez des données dans la version web :

1. Ouvrez l'ancienne version web (navigateur)
2. Dashboard → "Télécharger sauvegarde" → Sauvegarder le fichier JSON
3. Fermez le navigateur
4. Lancez la version Electron (`npm run dev:electron`)
5. Dashboard → "Restaurer" → Sélectionnez votre fichier JSON
6. ✅ Vos données sont maintenant dans SQLite !

### 3. Créer un installeur Windows

```bash
npm run build:win
```

L'installeur sera dans `release/` :
- `MEV - Module Évaluation Setup 1.0.0.exe`

Double-cliquez pour installer sur n'importe quel PC Windows.

### 4. (Optionnel) Créer pour macOS/Linux

```bash
npm run build:mac    # macOS (.dmg)
npm run build:linux  # Linux (.AppImage + .deb)
```

## 🎯 Commandes Principales

| Commande | Usage |
|----------|-------|
| `npm run dev:electron` | Développement (hot reload) |
| `npm run build:win` | Installeur Windows |
| `npm run build:mac` | Installeur macOS |
| `npm run build:linux` | Installeur Linux |

## 📁 Où sont mes données ?

**Windows** : `C:\Users\[VotreNom]\AppData\Roaming\mev-evaluation\mev-evaluation.sqlite`

Fichier unique, facile à sauvegarder !

## 🔧 En cas de problème

1. **L'app ne démarre pas** :
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   npm run dev:electron
   ```

2. **Erreurs de build** :
   ```bash
   npm run build
   npx tsc -p electron/tsconfig.json
   npm run dev:electron
   ```

3. **SQLite database locked** :
   - Fermez toutes les instances de l'app
   - Supprimez `mev-evaluation.sqlite-wal` et `-shm`
   - Relancez

## ⚡ Avantages Electron

✅ **Plus rapide** - SQLite natif vs IndexedDB browser  
✅ **Hors ligne** - Fonctionne sans connexion  
✅ **Installable** - Icône sur le bureau  
✅ **Cross-platform** - Windows, Mac, Linux avec le même code  
✅ **Backups faciles** - Un seul fichier .sqlite  
✅ **Pas de limites** - Autant de projets que vous voulez  

## 📖 Documentation Complète

Lisez [ELECTRON_README.md](./ELECTRON_README.md) pour plus de détails.

## 🎓 Pour commencer maintenant

```bash
# Étape 1 : Tester
npm run dev:electron

# Étape 2 : Si tout fonctionne, créer l'installeur
npm run build:win

# Étape 3 : Distribuer le fichier .exe à vos collègues
```

---

**🎉 Votre application est maintenant une vraie application Windows !**

*Questions ? Consultez la doc ou vérifiez les logs dans le terminal.*
