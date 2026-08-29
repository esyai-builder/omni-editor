export interface DecodedFrame {
  source: VideoFrame | HTMLVideoElement;
  width: number;
  height: number;
  timestamp_ms: number;
}

interface PoolEntry { url: string; video: HTMLVideoElement; webcodecsDecoder?: VideoDecoder; ready: boolean; }

const pool = new Map<string, PoolEntry>();

export function isWebCodecsAvailable(): boolean { return typeof (globalThis as any).VideoDecoder !== 'undefined'; }

function fileUrl(path: string): string {
  if (path.startsWith('file://')) return path;
  return 'file:///' + path.replace(/\\/g, '/');
}

export async function loadVideo(path: string): Promise<PoolEntry> {
  const url = fileUrl(path);
  if (pool.has(url)) return pool.get(url)!;
  const video = document.createElement('video');
  video.src = url;
  video.preload = 'auto';
  video.crossOrigin = 'anonymous';
  video.muted = true;
  await new Promise<void>((resolve, reject) => {
    const ok = () => { cleanup(); resolve(); };
    const fail = () => { cleanup(); reject(new Error(`Failed to load ${path}`)); };
    const cleanup = () => { video.removeEventListener('loadedmetadata', ok); video.removeEventListener('error', fail); };
    video.addEventListener('loadedmetadata', ok);
    video.addEventListener('error', fail);
  });
  const entry: PoolEntry = { url, video, ready: true };
  pool.set(url, entry);
  return entry;
}

export async function decodeFrame(path: string, timeMs: number): Promise<DecodedFrame | null> {
  const entry = await loadVideo(path);
  const v = entry.video;
  return new Promise<DecodedFrame | null>((resolve) => {
    let done = false;
    const onSeeked = () => {
      if (done) return;
      done = true;
      v.removeEventListener('seeked', onSeeked);
      resolve({ source: v, width: v.videoWidth, height: v.videoHeight, timestamp_ms: timeMs });
    };
    v.addEventListener('seeked', onSeeked);
    if (Math.abs(v.currentTime * 1000 - timeMs) < 1) { onSeeked(); return; }
    v.currentTime = Math.max(0, timeMs / 1000);
    setTimeout(() => { if (!done) { done = true; v.removeEventListener('seeked', onSeeked); resolve(null); } }, 1500);
  });
}

export function createAudioElement(path: string): HTMLAudioElement {
  const a = new Audio();
  a.src = fileUrl(path);
  a.preload = 'auto';
  a.crossOrigin = 'anonymous';
  return a;
}

export function clearPool() {
  for (const e of pool.values()) { try { e.video.pause(); e.video.removeAttribute('src'); e.video.load(); } catch {} }
  pool.clear();
}
