import type { MediaAsset, MediaKind } from '@shared/types';
import { v4 as uuid } from './uuid';

export interface ProbeData {
  duration_ms: number; width: number; height: number; fps: number;
  has_audio: boolean; audio_sample_rate?: number; audio_channels?: number;
  video_codec?: string | null; audio_codec?: string | null;
}

export async function probeMedia(path: string): Promise<ProbeData> {
  if (!window.kvedit) return { duration_ms: 0, width: 0, height: 0, fps: 0, has_audio: false };
  try { return await (window as any).kvedit.ipcProbe(path); }
  catch { return { duration_ms: 0, width: 0, height: 0, fps: 0, has_audio: false }; }
}

export async function buildMediaAsset(path: string, kind: MediaKind): Promise<MediaAsset> {
  const name = path.split(/[\\/]/).pop() || 'untitled';
  const base: MediaAsset = { id: uuid(), kind, path, name, duration_ms: 0, width: 0, height: 0, fps: 0, has_audio: kind === 'video', thumbnail_path: null, waveform_path: null };
  if (kind === 'image') { const dims = await loadImageDims(path); base.width = dims.w; base.height = dims.h; }
  return base;
}

function fileUrl(path: string): string { if (path.startsWith('file://')) return path; return 'file:///' + path.replace(/\\/g, '/'); }

export async function loadImageDims(path: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve({ w: 0, h: 0 });
    img.src = fileUrl(path);
  });
}

export async function generateThumbnail(path: string, kind: MediaKind, width = 160, height = 90): Promise<string> {
  const c = document.createElement('canvas');
  c.width = width; c.height = height;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#222'; ctx.fillRect(0, 0, width, height);
  if (kind === 'image') {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { drawCover(ctx, img, width, height); resolve(c.toDataURL('image/jpeg', 0.7)); };
      img.onerror = () => resolve(c.toDataURL('image/jpeg', 0.7));
      img.src = fileUrl(path);
    });
  }
  if (kind === 'video') {
    return new Promise((resolve) => {
      const v = document.createElement('video');
      v.preload = 'metadata'; v.muted = true; v.crossOrigin = 'anonymous'; v.src = fileUrl(path);
      v.addEventListener('loadeddata', () => { v.currentTime = Math.min(1, v.duration / 2); });
      v.addEventListener('seeked', () => { try { drawCover(ctx, v, width, height); } catch {} resolve(c.toDataURL('image/jpeg', 0.7)); });
      v.addEventListener('error', () => resolve(c.toDataURL('image/jpeg', 0.7)));
    });
  }
  return c.toDataURL('image/jpeg', 0.7);
}

function drawCover(ctx: CanvasRenderingContext2D, src: CanvasImageSource, w: number, h: number) {
  const sw = (src as any).videoWidth || (src as HTMLImageElement).naturalWidth || w;
  const sh = (src as any).videoHeight || (src as HTMLImageElement).naturalHeight || h;
  const scale = Math.max(w / sw, h / sh);
  const dw = sw * scale, dh = sh * scale;
  ctx.drawImage(src, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

export async function generateWaveformPeaks(path: string, samples = 1000): Promise<number[]> {
  try {
    const res = await fetch(fileUrl(path));
    const buf = await res.arrayBuffer();
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audio = await ctx.decodeAudioData(buf);
    const channel = audio.getChannelData(0);
    const block = Math.floor(channel.length / samples);
    const peaks: number[] = [];
    for (let i = 0; i < samples; i++) {
      let max = 0;
      for (let j = 0; j < block; j++) { const v = Math.abs(channel[i * block + j] || 0); if (v > max) max = v; }
      peaks.push(max);
    }
    return peaks;
  } catch { return Array(samples).fill(0).map(() => Math.random() * 0.5); }
}
