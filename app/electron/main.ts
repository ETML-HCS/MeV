import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { initDatabase } from './database.js'
import { autoUpdater } from 'electron-updater'
import log from 'electron-log'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Configuration des logs pour l'auto-updater
log.transports.file.level = 'info'
autoUpdater.logger = log

// Événements de mise à jour
autoUpdater.on('checking-for-update', () => {
  log.info('Vérification des mises à jour...')
})
autoUpdater.on('update-available', (info) => {
  log.info('Mise à jour disponible.', info)
  mainWindow?.webContents.send('update-available', info)
})
autoUpdater.on('update-not-available', (info) => {
  log.info('Aucune mise à jour disponible.', info)
})
autoUpdater.on('error', (err) => {
  log.error('Erreur lors de la mise à jour : ' + err)
})
autoUpdater.on('download-progress', (progressObj) => {
  let log_message = "Vitesse de téléchargement: " + progressObj.bytesPerSecond
  log_message = log_message + ' - Téléchargé ' + progressObj.percent + '%'
  log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')'
  log.info(log_message)
})
autoUpdater.on('update-downloaded', (info) => {
  log.info('Mise à jour téléchargée')
  mainWindow?.webContents.send('update-downloaded', info)
})

// Garde une référence globale de la fenêtre pour éviter le garbage collection
let mainWindow: BrowserWindow | null = null
const devServerPort = process.env.VITE_DEV_SERVER_PORT || '5273'

function createWindow() {
  // Résoudre le chemin de l'icône selon le contexte (dev vs production)
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'build', 'icon.ico')
    : path.join(app.getAppPath(), 'build', 'icon.ico')

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    title: 'MEV',
    icon: iconPath,
    backgroundColor: '#f8fafc',
    show: false, // Ne pas afficher avant que tout soit prêt
  })

  // Prêt à afficher
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  // Charger l'app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL(`http://localhost:${devServerPort}`)
    mainWindow.webContents.openDevTools()
  } else {
    // En production, utiliser app.getAppPath() pour obtenir le chemin correct
    const indexPath = path.join(app.getAppPath(), 'dist', 'index.html')
    mainWindow.loadFile(indexPath)
  }

  // Logger uniquement les erreurs de chargement
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('❌ Failed to load app:', errorCode, errorDescription)
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// Initialisation de l'app
app.whenReady().then(async () => {
  // Initialiser la base de données SQLite
  await initDatabase()

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })

  // Lancer la vérification des mises à jour (ne fonctionne qu'en production)
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify()
  }
})

// Quitter quand toutes les fenêtres sont fermées (sauf sur macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Importer les handlers IPC
import './ipc-handlers.js'
