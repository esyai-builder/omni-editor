import type { Project, ExportSettings, MediaKind } from './types';

export interface IpcApi {
  // Project lifecycle
  newProject(): Promise<Project>;
  loadProject(path: string): Promise<string>;
  saveProject(path: string, project: Project): Promise<void>;
  autosaveProject(project: Project): Promise<string | null>;

  // Media
  pickMediaFiles(): Promise<string[]>;
  detectMediaKind(path: string): Promise<MediaKind>;

  // Export
  exportProject(
    project: Project,
    settings: ExportSettings,
  ): Promise<{ success: boolean; outputPath?: string; error?: string }>;
  cancelExport(): Promise<void>;
  onExportProgress(cb: (p: {
    stage: string;
    percent: number;
    message: string;
  }) => void): () => void;

  // Dialogs
  showOpenDialog(opts: {
    title?: string;
    filters?: { name: string; extensions: string[] }[];
    properties?: string[];
  }): Promise<string[] | null>;
  showSaveDialog(opts: {
    title?: string;
    defaultPath?: string;
    filters?: { name: string; extensions: string[] }[];
  }): Promise<string | null>;

  // App
  getVersion(): Promise<string>;
  showInFolder(path: string): Promise<void>;
}

declare global {
  interface Window {
    kvedit: IpcApi;
  }
}

export {};
