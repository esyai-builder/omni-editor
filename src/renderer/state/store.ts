import { create } from 'zustand';
import type { Project, MediaAsset, Clip, Track, Uuid, ExportSettings, ExportProgress } from '@shared/types';
import { v4 as uuid } from '../engine/uuid';

interface AppState {
  project: Project;
  projectPath: string | null;
  selectedClipId: Uuid | null;
  playheadMs: number;
  isPlaying: boolean;
  zoomPxPerSec: number;
  dirty: boolean;
  exportSettings: ExportSettings;
  exportProgress: ExportProgress | null;
  showExportDialog: boolean;
  toast: string | null;

  setProject: (p: Project) => void;
  newProject: () => void;
  setProjectPath: (p: string | null) => void;
  markClean: () => void;
  selectClip: (id: Uuid | null) => void;
  setPlayhead: (ms: number) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setZoom: (z: number) => void;

  addMedia: (asset: MediaAsset) => void;
  removeMedia: (id: Uuid) => void;
  addClip: (trackId: Uuid, clip: Clip) => void;
  updateClip: (trackId: Uuid, clipId: Uuid, patch: Partial<Clip>) => void;
  removeClip: (trackId: Uuid, clipId: Uuid) => void;
  splitClip: (trackId: Uuid, clipId: Uuid, atMs: number) => void;
  moveClip: (trackId: Uuid, clipId: Uuid, newStartMs: number) => void;

  setExportSettings: (s: Partial<ExportSettings>) => void;
  setExportProgress: (p: ExportProgress | null) => void;
  setShowExportDialog: (b: boolean) => void;
  setToast: (t: string | null) => void;
}

const newTrack = (kind: Track['kind'], name: string): Track => ({ id: uuid(), kind, name, enabled: true, locked: false, volume: 1.0, clips: [] });
const buildDefaultTracks = (): Track[] => [ newTrack('overlay', 'Overlay'), newTrack('video', 'Video 1'), newTrack('video', 'Video 2'), newTrack('audio', 'Audio 1'), newTrack('audio', 'Audio 2') ];

const newProject = (): Project => {
  const now = new Date().toISOString();
  return { schema_version: 1, settings: { name: 'Untitled', width: 1920, height: 1080, fps: 30, sample_rate: 48000, background_color: '#000000' }, media: [], tracks: buildDefaultTracks(), created_at: now, updated_at: now };
};

export const useStore = create<AppState>((set) => ({
  project: newProject(), projectPath: null, selectedClipId: null, playheadMs: 0, isPlaying: false, zoomPxPerSec: 50, dirty: false,
  exportSettings: { output_path: '', format: 'mp4_h264', width: 1920, height: 1080, fps: 30, video_bitrate_kbps: 8000, audio_bitrate_kbps: 192, hardware_accel: 'auto' },
  exportProgress: null, showExportDialog: false, toast: null,

  setProject: (p) => set({ project: p, dirty: true }),
  newProject: () => set({ project: newProject(), projectPath: null, selectedClipId: null, playheadMs: 0, isPlaying: false, dirty: false }),
  setProjectPath: (p) => set({ projectPath: p, dirty: false }),
  markClean: () => set({ dirty: false }),
  selectClip: (id) => set({ selectedClipId: id }),
  setPlayhead: (ms) => set({ playheadMs: Math.max(0, ms) }),
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),
  setZoom: (z) => set({ zoomPxPerSec: Math.max(10, Math.min(500, z)) }),

  addMedia: (asset) => set((s) => ({ project: { ...s.project, media: [...s.project.media, asset], updated_at: new Date().toISOString() }, dirty: true })),
  removeMedia: (id) => set((s) => ({ project: { ...s.project, media: s.project.media.filter((m) => m.id !== id), tracks: s.project.tracks.map((t) => ({ ...t, clips: t.clips.filter((c) => c.media_id !== id) })), updated_at: new Date().toISOString() }, dirty: true })),

  addClip: (trackId, clip) => set((s) => ({ project: { ...s.project, tracks: s.project.tracks.map((t) => t.id === trackId ? { ...t, clips: [...t.clips, clip] } : t), updated_at: new Date().toISOString() }, dirty: true })),
  updateClip: (trackId, clipId, patch) => set((s) => ({ project: { ...s.project, tracks: s.project.tracks.map((t) => t.id === trackId ? { ...t, clips: t.clips.map((c) => c.id === clipId ? { ...c, ...patch } : c) } : t), updated_at: new Date().toISOString() }, dirty: true })),
  removeClip: (trackId, clipId) => set((s) => ({ project: { ...s.project, tracks: s.project.tracks.map((t) => t.id === trackId ? { ...t, clips: t.clips.filter((c) => c.id !== clipId) } : t), updated_at: new Date().toISOString() }, dirty: true, selectedClipId: s.selectedClipId === clipId ? null : s.selectedClipId })),
  splitClip: (trackId, clipId, atMs) => set((s) => {
    const tracks = s.project.tracks.map((t) => {
      if (t.id !== trackId) return t;
      const idx = t.clips.findIndex((c) => c.id === clipId);
      if (idx < 0) return t;
      const c = t.clips[idx];
      const localMs = atMs - c.start_ms;
      if (localMs <= 0 || localMs >= c.duration_ms) return t;
      const left: Clip = { ...c, duration_ms: localMs, source_out_ms: c.source_in_ms + localMs };
      const right: Clip = { ...c, id: uuid(), start_ms: c.start_ms + localMs, duration_ms: c.duration_ms - localMs, source_in_ms: c.source_in_ms + localMs };
      const clips = [...t.clips]; clips.splice(idx, 1, left, right);
      return { ...t, clips };
    });
    return { project: { ...s.project, tracks, updated_at: new Date().toISOString() }, dirty: true };
  }),
  moveClip: (trackId, clipId, newStartMs) => set((s) => ({ project: { ...s.project, tracks: s.project.tracks.map((t) => t.id === trackId ? { ...t, clips: t.clips.map((c) => c.id === clipId ? { ...c, start_ms: Math.max(0, newStartMs) } : c) } : t), updated_at: new Date().toISOString() }, dirty: true })),

  setExportSettings: (s) => set((st) => ({ exportSettings: { ...st.exportSettings, ...s } })),
  setExportProgress: (p) => set({ exportProgress: p }),
  setShowExportDialog: (b) => set({ showExportDialog: b }),
  setToast: (t) => set({ toast: t }),
}));

export const totalDurationMs = (project: Project): number => project.tracks.flatMap((t) => t.clips).reduce((m, c) => Math.max(m, c.start_ms + c.duration_ms), 0);
export const findClip = (project: Project, clipId: Uuid): { track: Track; clip: Clip } | null => {
  for (const t of project.tracks) { const c = t.clips.find((c) => c.id === clipId); if (c) return { track: t, clip: c }; }
  return null;
};
