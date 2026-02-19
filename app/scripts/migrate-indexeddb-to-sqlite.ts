/**
 * Script de migration IndexedDB → SQLite
 * 
 * Ce script aide à migrer vos données existantes depuis IndexedDB (browser)
 * vers la nouvelle base SQLite (Electron).
 * 
 * UTILISATION:
 * 1. Ouvrez l'ancienne version web de l'application
 * 2. Utilisez le bouton "Télécharger sauvegarde" pour exporter vos données en JSON
 * 3. Lancez la nouvelle version Electron
 * 4. Utilisez le bouton "Restaurer" ou "Fusionner" pour importer le fichier JSON
 * 
 * La migration est automatique et transparente !
 */

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                  MIGRATION IndexedDB → SQLite                 ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Vos données sont maintenant stockées dans SQLite !          ║
║                                                               ║
║  Emplacement: %APPDATA%/mev-evaluation/mev-evaluation.sqlite ║
║                                                               ║
║  Pour migrer depuis l'ancienne version web:                  ║
║  1. Version web → Télécharger sauvegarde (JSON)             ║
║  2. Version Electron → Importer le fichier JSON             ║
║                                                               ║
║  Avantages de SQLite:                                        ║
║  ✓ Plus rapide                                               ║
║  ✓ Pas de limite de taille                                   ║
║  ✓ Fichier unique facilement sauvegardable                   ║
║  ✓ Compatible avec d'autres outils SQL                       ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`)

export {}
