import { app, BrowserWindow, ipcMain, dialog, shell, Menu } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';

const isDev = process.env.NODE_ENV === 'development';
const DEV_URL = 'http://localhost:5173';

let mainWindow: BrowserWindow | null = null;
let activeExport: ReturnType<typeof spawn> | null = null;

const AUTOSAVE_DIR = path.join(app.getPath('userData'), 'autosave');
const FFMPEG = require('ffmpeg-static') as string | null;
const FFPROBE = require('ffprobe-static') as { path: string } | null;

function buildMenu() {
  const isMac = process.platform === 'darwin';
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac ? [{ role: 'appMenu' as const }] : []),
    {
      label: 'File',
      submenu: [
        { label: 'New Project', accelerator: 'CmdOrCtrl+N', click: () => mainWindow?.webContents.send('menu:new-project') },
        { label: 'Open Project...', accelerator: 'CmdOrCtrl+O', click: () => mainWindow?.webContents.send('menu:open-project') },
        { label: 'Save Project', accelerator: 'CmdOrCtrl+S', click: () => mainWindow?.webContents.send('menu:save-project') },
        { label: 'Save Project As...', accelerator: 'CmdOrCtrl+Shift+S', click: () => mainWindow?.webContents.send('menu:save-project-as') },
        { type: 'separator' },
        { label: 'Import Media...', accelerator: 'CmdOrCtrl+I', click: () => mainWindow?.webContents.send('menu:import-media') },
        { type: 'separator' },
        { label: 'Export...', accelerator: 'CmdOrCtrl+E', click: () => mainWindow?.webContents.send('menu:export') },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' },
    {
      role: 'help',
      submenu: [
        { label: 'About KVedit', click: () => mainWindow?.webContents.send('menu:about') },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: '#1a1a1a',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow?.show());

  if (isDev) {
    await mainWindow.loadURL(DEV_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(async () => {
  await fs.mkdir(AUTOSAVE_DIR, { recursive: true });
  buildMenu();
  await createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ---- IPC handlers ----

ipcMain.handle('project:new', () => {
  const now = new Date().toISOString();
  return {
    schema_version: 1,
    settings: { name: 'Untitled', width: 1920, height: 1080, fps: 30, sample_rate: 48000, background_color: '#000000' },
    media: [],
    tracks: [
      { id: randomUUID(), kind: 'overlay', name: 'Overlay', enabled: true, locked: false, volume: 1.0, clips: [] },
      { id: randomUUID(), kind: 'video', name: 'Video 1', enabled: true, locked: false, volume: 1.0, clips: [] },
      { id: randomUUID(), kind: 'video', name: 'Video 2', enabled: true, locked: false, volume: 1.0, clips: [] },
      { id: randomUUID(), kind: 'audio', name: 'Audio 1', enabled: true, locked: false, volume: 1.0, clips: [] },
      { id: randomUUID(), kind: 'audio', name: 'Audio 2', enabled: true, locked: false, volume: 1.0, clips: [] },
    ],
    created_at: now,
    updated_at: now,
  };
});

ipcMain.handle('dialog:open', async (_e, opts) => {
  const r = await dialog.showOpenDialog(mainWindow!, {
    title: opts?.title,
    properties: (opts?.properties as ('openFile' | 'multiSelections')[]) ?? ['openFile', 'multiSelections'],
    filters: opts?.filters,
  });
  return r.canceled ? null : r.filePaths;
});

ipcMain.handle('dialog:save', async (_e, opts) => {
  const r = await dialog.showSaveDialog(mainWindow!, {
    title: opts?.title,
    defaultPath: opts?.defaultPath,
    filters: opts?.filters,
  });
  return r.canceled ? null : r.filePath;
});

ipcMain.handle('app:version', () => app.getVersion());

ipcMain.handle('shell:show-in-folder', async (_e, p: string) => {
  shell.showItemInFolder(p);
});

ipcMain.handle('media:detect-kind', async (_e, filePath: string) => {
  const ext = path.extname(filePath).toLowerCase().replace('.', '');
  if (['mp4','mov','mkv','webm','avi','m4v'].includes(ext)) return 'video';
  if (['mp3','wav','aac','flac','ogg','m4a'].includes(ext)) return 'audio';
  if (['jpg','jpeg','png','bmp','gif','webp','tiff'].includes(ext)) return 'image';
  return 'video';
});

ipcMain.handle('media:probe', async (_e, filePath: string) => {
  if (!FFPROBE?.path) return { duration_ms: 0, width: 0, height: 0, fps: 30, has_audio: false };
  return new Promise((resolve) => {
    const args = [
      '-v', 'quiet', '-print_format', 'json',
      '-show_format', '-show_streams', filePath,
    ];
    const proc = spawn(FFPROBE.path, args);
    let out = '';
    proc.stdout.on('data', (d) => out += d.toString());
    proc.on('close', () => {
      try {
        const json = JSON.parse(out);
        const v = (json.streams || []).find((s: any) => s.codec_type === 'video');
        const a = (json.streams || []).find((s: any) => s.codec_type === 'audio');
        const fpsRaw = v?.r_frame_rate || '30/1';
        const [fn, fd] = fpsRaw.split('/').map(Number);
        const fps = fd ? fn / fd : 30;
        const dur = parseFloat(json.format?.duration || '0') * 1000;
        resolve({
          duration_ms: Math.round(dur),
          width: v?.width || 0,
          height: v?.height || 0,
          fps: fps || 30,
          has_audio: !!a,
          audio_sample_rate: a?.sample_rate ? parseInt(a.sample_rate) : 48000,
          audio_channels: a?.channels || 2,
          video_codec: v?.codec_name || null,
          audio_codec: a?.codec_name || null,
        });
      } catch {
        resolve({ duration_ms: 0, width: 0, height: 0, fps: 30, has_audio: false });
      }
    });
    proc.on('error', () => resolve({ duration_ms: 0, width: 0, height: 0, fps: 30, has_audio: false }));
  });
});

ipcMain.handle('project:save', async (_e, filePath: string, json: string) => {
  await fs.writeFile(filePath, json, 'utf-8');
});

ipcMain.handle('project:load', async (_e, filePath: string) => {
  return fs.readFile(filePath, 'utf-8');
});

ipcMain.handle('project:autosave', async (_e, json: string) => {
  try {
    await fs.mkdir(AUTOSAVE_DIR, { recursive: true });
    const name = `autosave-${Date.now()}-${randomUUID().slice(0, 8)}.kvedit`;
    const p = path.join(AUTOSAVE_DIR, name);
    await fs.writeFile(p, json, 'utf-8');
    return p;
  } catch {
    return null;
  }
});

ipcMain.handle('project:list-autosaves', async () => {
  try {
    const files = await fs.readdir(AUTOSAVE_DIR);
    return files.filter(f => f.endsWith('.kvedit')).map(f => path.join(AUTOSAVE_DIR, f));
  } catch { return []; }
});

// ---- Export ----

ipcMain.handle('export:start', async (event, argsJson: string) => {
  const args = JSON.parse(argsJson) as { args: string[]; outputPath: string };
  if (!FFMPEG) {
    event.sender.send('export:progress', { stage: 'error', percent: 0, message: 'ffmpeg-static not available' });
    return { success: false, error: 'ffmpeg-static not available' };
  }
  return new Promise((resolve) => {
    const proc = spawn(FFMPEG, args.args);
    activeExport = proc;
    let stderr = '';
    proc.stderr.on('data', (d) => {
      const s = d.toString();
      stderr += s;
      const m = s.match(/time=(\d+):(\d+):(\d+\.\d+)/);
      if (m) {
        const ms = ((+m[1]) * 3600 + (+m[2]) * 60 + (+m[3])) * 1000;
        event.sender.send('export:progress', {
          stage: 'encoding', percent: -1, message: 'Encoding',
          current_time_ms: Math.round(ms),
        });
      }
    });
    proc.on('close', (code) => {
      activeExport = null;
      if (code === 0) {
        event.sender.send('export:progress', { stage: 'done', percent: 100, message: 'Done' });
        resolve({ success: true, outputPath: args.outputPath });
      } else {
        event.sender.send('export:progress', { stage: 'error', percent: 0, message: `ffmpeg exit ${code}` });
        resolve({ success: false, error: stderr.slice(-2000) });
      }
    });
    proc.on('error', (e) => {
      activeExport = null;
      event.sender.send('export:progress', { stage: 'error', percent: 0, message: e.message });
      resolve({ success: false, error: e.message });
    });
  });
});

ipcMain.handle('export:cancel', async () => {
  if (activeExport) {
    activeExport.kill('SIGTERM');
    activeExport = null;
  }
});

// Forward menu events
['menu:new-project', 'menu:open-project', 'menu:save-project', 'menu:save-project-as',
 'menu:import-media', 'menu:export', 'menu:about'].forEach(ch => {
  ipcMain.on(ch, () => mainWindow?.webContents.send(ch));
});
