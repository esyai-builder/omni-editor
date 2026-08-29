import { contextBridge, ipcRenderer } from 'electron';
import type { Project, ExportSettings } from '../shared/types';

const api: any = {
  newProject: () => ipcRenderer.invoke('project:new'),
  loadProject: (p: string) => ipcRenderer.invoke('project:load', p),
  saveProject: (p: string, project: Project) => ipcRenderer.invoke('project:save', p, JSON.stringify(project)),
  autosaveProject: (project: Project) => ipcRenderer.invoke('project:autosave', JSON.stringify(project)),

  pickMediaFiles: () => ipcRenderer.invoke('dialog:open', {
    title: 'Import Media',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Media', extensions: ['mp4','mov','mkv','webm','avi','m4v','mp3','wav','aac','flac','ogg','m4a','jpg','jpeg','png','bmp','gif','webp'] },
    ],
  }),
  detectMediaKind: (p: string) => ipcRenderer.invoke('media:detect-kind', p),
  ipcProbe: (p: string) => ipcRenderer.invoke('media:probe', p),

  // Export uses the existing channel; renderer builds args
  startFFmpeg: (args: string[], outputPath: string) => ipcRenderer.invoke('export:start', JSON.stringify({ args, outputPath })),
  cancelExport: () => ipcRenderer.invoke('export:cancel'),
  onExportProgress: (cb: (p: { stage: string; percent: number; message: string }) => void) => {
    const listener = (_: unknown, p: { stage: string; percent: number; message: string }) => cb(p);
    ipcRenderer.on('export:progress', listener);
    return () => ipcRenderer.removeListener('export:progress', listener);
  },

  showOpenDialog: (opts: any) => ipcRenderer.invoke('dialog:open', opts),
  showSaveDialog: (opts: any) => ipcRenderer.invoke('dialog:save', opts),

  getVersion: () => ipcRenderer.invoke('app:version'),
  showInFolder: (p: string) => ipcRenderer.invoke('shell:show-in-folder', p),
};

contextBridge.exposeInMainWorld('kvedit', api);
contextBridge.exposeInMainWorld('electronAPI', {
  startFFmpeg: (args: string[], outputPath: string) => api.startFFmpeg(args, outputPath),
  onFFmpegProgress: (cb: (p: any) => void) => api.onExportProgress(cb),
});
