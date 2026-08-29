import React, { useEffect, useRef } from 'react';
import { useStore, totalDurationMs, findClip } from '../../state/store';
import { Compositor, activeClipsAtTime } from '../../engine/compositor';
import { decodeFrame } from '../../engine/decoder';
import { getImageElement, setImageElement } from '../../engine/cache';
import type { Clip, MediaAsset } from '@shared/types';

function fileUrl(path: string): string { if (path.startsWith('file://')) return path; return 'file:///' + path.replace(/\\/g, '/'); }

export const Preview: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const compositorRef = useRef<Compositor | null>(null);
  const lastFrameRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const playheadMs = useStore((s) => s.playheadMs);
  const isPlaying = useStore((s) => s.isPlaying);
  const project = useStore((s) => s.project);
  const selectedClipId = useStore((s) => s.selectedClipId);

  useEffect(() => {
    if (!canvasRef.current) return;
    try { const c = new Compositor(canvasRef.current); c.resize(project.settings.width, project.settings.height); compositorRef.current = c; }
    catch (e) { console.error('WebGL2 init failed', e); }
  }, [project.settings.width, project.settings.height]);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      const comp = compositorRef.current;
      const st = useStore.getState();
      if (!comp) { rafRef.current = requestAnimationFrame(tick); return; }
      let now = st.playheadMs;
      if (st.isPlaying) {
        const dt = performance.now() - lastFrameRef.current;
        lastFrameRef.current = performance.now();
        now = st.playheadMs + dt;
        const total = totalDurationMs(st.project);
        if (now >= total) { st.pause(); st.setPlayhead(0); } else st.setPlayhead(now);
      } else { lastFrameRef.current = performance.now(); }
      comp.beginFrame(hexToRgb(st.project.settings.background_color));
      const layers = activeClipsAtTime(st.project, now);
      for (const { clip, media } of layers) {
        if (!media) continue;
        const texture = await getTextureForMedia(comp, media, clip, now);
        if (!texture) continue;
        const cx = clip.transform.position?.x ?? st.project.settings.width / 2;
        const cy = clip.transform.position?.y ?? st.project.settings.height / 2;
        comp.drawLayer(texture.tex, texture.w, texture.h, cx, cy, clip.transform.scale, clip.transform.rotation, clip.transform.opacity, { brightness: clip.color.brightness, contrast: clip.color.contrast, saturation: clip.color.saturation, exposure: clip.color.exposure, hue: clip.color.hue });
      }
      comp.endFrame();
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { cancelled = true; if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [project]);

  useEffect(() => {
    if (selectedClipId) { const found = findClip(project, selectedClipId); if (found) useStore.getState().setPlayhead(found.clip.start_ms + 100); }
  }, [selectedClipId]);

  const fmt = (ms: number) => { const s = Math.floor(ms / 1000); const m = Math.floor(s / 60); return `${m.toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}.${Math.floor((ms % 1000) / 10).toString().padStart(2, '0')}`; };
  const total = totalDurationMs(project);

  return (
    <>
      <div className="panel-header"><span>🎬 Preview</span><div className="spacer" style={{ flex: 1 }} /><span style={{ fontSize: 10, color: 'var(--fg-3)' }}>{project.settings.width}×{project.settings.height}</span></div>
      <div className="preview-canvas-wrap">
        <canvas ref={canvasRef} className="preview-canvas" style={{ aspectRatio: `${project.settings.width}/${project.settings.height}` }} />
        <div className="preview-overlay-info">{project.settings.fps} fps • {project.media.length} media</div>
      </div>
      <div className="transport">
        <button onClick={() => useStore.getState().setPlayhead(0)} title="Go to start">⏮</button>
        <button onClick={() => useStore.getState().setPlayhead(useStore.getState().playheadMs - 5000)} title="-5s">⏪</button>
        <button onClick={() => useStore.getState().togglePlay()} title="Play/Pause" style={{ minWidth: 50 }}>{isPlaying ? '⏸' : '▶'}</button>
        <button onClick={() => useStore.getState().setPlayhead(useStore.getState().playheadMs + 5000)} title="+5s">⏩</button>
        <button onClick={() => { useStore.getState().pause(); useStore.getState().setPlayhead(total); }} title="Go to end">⏭</button>
        <div className="timecode">{fmt(useStore.getState().playheadMs)} / {fmt(total)}</div>
      </div>
    </>
  );
};

interface TextureEntry { tex: WebGLTexture; w: number; h: number; }
const texCache = new Map<string, TextureEntry>();

async function getTextureForMedia(comp: Compositor, media: MediaAsset, clip: Clip, playheadMs: number): Promise<TextureEntry | null> {
  const key = media.id + ':' + playheadMs;
  if (texCache.has(key)) return texCache.get(key)!;
  if (media.kind === 'image') {
    let img = getImageElement(media.path);
    if (!img) { img = new Image(); img.src = fileUrl(media.path); img.crossOrigin = 'anonymous'; await new Promise((res) => { img!.onload = () => res(null); img!.onerror = () => res(null); }); setImageElement(media.path, img!); }
    const w = img.naturalWidth || 1, h = img.naturalHeight || 1;
    comp.uploadImage(key, img, w, h);
    const tex = (comp as any).textureCache?.get(key)?.texture || (comp as any).fallbackSolidTexture;
    const e: TextureEntry = { tex, w, h }; texCache.set(key, e);
    if (texCache.size > 200) { const first = texCache.keys().next().value; if (first) { comp.deleteTexture(first); texCache.delete(first); } }
    return e;
  }
  if (media.kind === 'video') {
    const localMs = playheadMs - clip.start_ms;
    const sourceMs = clip.source_in_ms + Math.max(0, localMs);
    const f = await decodeFrame(media.path, sourceMs);
    if (!f) return { tex: comp.getFallbackTexture(), w: 1, h: 1 };
    const w = f.width || 1, h = f.height || 1;
    comp.uploadImage(key, f.source as any, w, h);
    const tex = (comp as any).textureCache?.get(key)?.texture || (comp as any).fallbackSolidTexture;
    const e: TextureEntry = { tex, w, h }; texCache.set(key, e);
    if (texCache.size > 200) { const first = texCache.keys().next().value; if (first) { comp.deleteTexture(first); texCache.delete(first); } }
    const vf = f.source as any; if (vf && typeof vf.close === 'function') { try { vf.close(); } catch {} }
    return e;
  }
  return null;
}

function hexToRgb(hex: string): [number, number, number, number] {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return [0, 0, 0, 1];
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16), 1];
}
