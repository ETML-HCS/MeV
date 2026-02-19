import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { initDatabase, getDatabase } from './database.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Garde une référence globale de la fenêtre pour éviter le garbage collection
let mainWindow: BrowserWindow | null = null

function createWindow() {
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
    title: 'MEV - Module Évaluation',
    icon: path.join(__dirname, '../build/icon.ico'),
    backgroundColor: '#f8fafc',
    show: false, // Ne pas afficher avant que tout soit prêt
  })

  // Prêt à afficher
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  // Charger l'app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
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
})

// Quitter quand toutes les fenêtres sont fermées (sauf sur macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Importer les handlers IPC
import './ipc-handlers.js'
