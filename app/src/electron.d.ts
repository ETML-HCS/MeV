import type { ElectronAPI } from '../electron/preload'

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
  const __APP_VERSION__: string
}

export {}
