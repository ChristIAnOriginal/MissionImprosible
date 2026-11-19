import { contextBridge, ipcRenderer } from 'electron'
import { createElectronAPI, localFileUrl } from '../shared/facade'

contextBridge.exposeInMainWorld('electronAPI', createElectronAPI(ipcRenderer, { kind: 'electron', fileUrl: localFileUrl }))
