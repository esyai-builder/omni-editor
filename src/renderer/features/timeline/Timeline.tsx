import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore, totalDurationMs } from '../../state/store';
import { getCachedWaveform } from '../../engine/cache';
import { v4 as uuid } from '../../engine/uuid';
import type { Clip, MediaAsset, Track } from '@shared/types';

export const Timeline: React.FC = () => {
  const { t } = useTranslation();
  const project = useStore((s) => s.project);
  const playheadMs = useStore((s) => s.playheadMs);
  const zoomPxPerSec = useStore((s) => s.zoomPxPerSec);
  const setZoom = useStore((s) => s.setZoom);
  const selectedClipId = useStore((s) => s.selectedClipId);
  const selectClip = useStore((s) => s.selectClip);
  const setPlayhead = useStore((s) => s.setPlayhead);
  const moveClip = useStore((s) => s.moveClip);
  const updateClip = useStore((s) => s.updateClip);
  const addClip = useStore((s) => s.addClip);
  const splitClip = useStore((s) => s.splitClip);
  const removeClip = useStore((s) => s.removeClip);

  const scrollRef = useRef<HTMLDivElement>(null);
  const total = totalDurationMs(project);
  const totalSec = Math.max(60, Math.ceil(total / 1000) + 10);
  const pxPerMs = zoomPxPerSec / 1000;
  const laneWidth = totalSec * zoomPxPerSec;

  const ticks: Array<{ x: number; major: boolean; label?: string }> = [];
  for (let s = 0; s <= totalSec; s++) { const x = s * zoomPxPerSec; ticks.push({ x, major: s % 5 === 0, label: s % 5 === 0 ? formatTime(s * 1000) : undefined }); }

  const onRulerClick = (e: React.MouseEvent) => { const rect = (e.currentTarget as HTMLElement).getBoundingClientRect(); const x = e.clientX - rect.left + (scrollRef.current?.scrollLeft || 0); setPlayhead(Math.max(0, x / pxPerMs)); };

  const onLaneDrop = (e: React.DragEvent, track: Track) => {
    e.preventDefault();
    const mediaId = e.dataTransfer.getData('application/x-kvedit-media');
    if (!mediaId) return;
    const media = project.media.find(m => m.id === mediaId);
    if (!media) return;
    if (track.kind === 'audio' && media.kind !== 'audio' && !media.has_audio) return;
    if (track.kind === 'overlay' && media.kind !== 'image') return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const startMs = Math.max(0, Math.round(x / pxPerMs));
    const duration = media.duration_ms > 0 ? media.duration_ms : 5000;
    const newClip: Clip = {
      id: uuid(), media_id: media.id, start_ms: startMs, duration_ms: Math.min(duration, 60000), source_in_ms: 0, source_out_ms: Math.min(duration, 60000),
      volume: 1.0, speed: 1.0, transform: { position: { x: project.settings.width / 2, y: project.settings.height / 2 }, scale: 1, rotation: 0, opacity: 1, keyframes: [] },
      color: { brightness: 0, contrast: 0, saturation: 0, hue: 0, exposure: 0, lut_name: null }, text: null, transition_in_ms: 0, transition_out_ms: 0,
    };
    addClip(track.id, newClip); selectClip(newClip.id);
  };

  const dragState = useRef<{ clipId: string; trackId: string; startX: number; startMs: number } | null>(null);
  const onClipMouseDown = (e: React.MouseEvent, clip: Clip, track: Track) => {
    if ((e.target as HTMLElement).classList.contains('clip-handle')) return;
    selectClip(clip.id);
    dragState.current = { clipId: clip.id, trackId: track.id, startX: e.clientX, startMs: clip.start_ms };
    const onMove = (ev: MouseEvent) => { if (!dragState.current) return; const dx = ev.clientX - dragState.current.startX; moveClip(track.id, clip.id, Math.max(0, dragState.current.startMs + Math.round(dx / pxPerMs))); };
    const onUp = () => { dragState.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
  };

  const onHandleMouseDown = (e: React.MouseEvent, clip: Clip, track: Track, side: 'left' | 'right') => {
    e.stopPropagation();
    const startX = e.clientX; const origStart = clip.start_ms; const origDur = clip.duration_ms; const origIn = clip.source_in_ms; const origOut = clip.source_out_ms;
    const onMove = (ev: MouseEvent) => {
      const dx = Math.round((ev.clientX - startX) / pxPerMs);
      if (side === 'left') { const dStart = Math.max(-origStart, Math.min(dx, origDur - 100)); updateClip(track.id, clip.id, { start_ms: origStart + dStart, duration_ms: origDur - dStart, source_in_ms: Math.max(0, origIn + dStart) }); }
      else { updateClip(track.id, clip.id, { duration_ms: Math.max(100, origDur + dx), source_out_ms: origOut + dx }); }
    };
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
  };

  return (
    <>
      <div className="panel-header"><span>⏱ {t('panels.timeline')}</span><div className="spacer" style={{ flex: 1 }} />
        <button onClick={() => { if (!selectedClipId) return; for (const t of project.tracks) { const c = t.clips.find(c => c.id === selectedClipId); if (c) { removeClip(t.id, c.id); break; } } }} disabled={!selectedClipId} style={{ padding: '2px 8px', fontSize: 11 }}>🗑 Delete</button>
        <button onClick={() => { if (!selectedClipId) return; for (const t of project.tracks) { const c = t.clips.find(c => c.id === selectedClipId); if (c) { splitClip(t.id, c.id, playheadMs); break; } } }} disabled={!selectedClipId} style={{ padding: '2px 8px', fontSize: 11 }}>✂ Split</button>
      </div>
      <div className="timeline">
        <div className="timeline-toolbar">
          <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>Zoom</span>
          <input type="range" min={10} max={300} value={zoomPxPerSec} onChange={(e) => setZoom(Number(e.target.value))} style={{ width: 120 }} />
          <span style={{ fontSize: 11, color: 'var(--fg-2)', minWidth: 36 }}>{zoomPxPerSec}px/s</span>
        </div>
        <div className="timeline-scroll" ref={scrollRef}>
          <div style={{ width: 100 + laneWidth, position: 'relative' }}>
            <div className="ruler" style={{ width: 100 + laneWidth }} onClick={onRulerClick}>
              <div style={{ position: 'absolute', left: 100, right: 0, top: 0, bottom: 0 }}>
                {ticks.map((t, i) => (<React.Fragment key={i}><div className={`ruler-tick ${t.major ? 'major' : 'minor'}`} style={{ left: t.x }} />{t.label && <div className="ruler-label" style={{ left: t.x }}>{t.label}</div>}</React.Fragment>))}
              </div>
            </div>
            <div className="tracks">
              {project.tracks.map((track) => (
                <div className="track" key={track.id}>
                  <div className="track-header"><div className="name">{track.name}</div><div className="kind">{track.kind}</div></div>
                  <div className={`track-lane ${track.kind === 'audio' ? 'audio' : ''}`} style={{ width: laneWidth }} onDragOver={(e) => e.preventDefault()} onDrop={(e) => onLaneDrop(e, track)} onClick={(e) => { if (e.target === e.currentTarget) selectClip(null); }}>
                    {track.clips.map((clip) => {
                      const media = project.media.find(m => m.id === clip.media_id);
                      return (<div key={clip.id} className={`clip ${track.kind} ${selectedClipId === clip.id ? 'selected' : ''}`} style={{ left: clip.start_ms * pxPerMs, width: clip.duration_ms * pxPerMs }} onMouseDown={(e) => onClipMouseDown(e, clip, track)} onDoubleClick={() => selectClip(clip.id)} title={media?.name || 'clip'}>
                        {track.kind === 'audio' && media && <WaveformBg path={media.path} width={clip.duration_ms * pxPerMs} height={48} />}
                        <div style={{ position: 'relative', zIndex: 2, pointerEvents: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{media?.name || '(no media)'}</div>
                        <div className="clip-handle left" onMouseDown={(e) => onHandleMouseDown(e, clip, track, 'left')} />
                        <div className="clip-handle right" onMouseDown={(e) => onHandleMouseDown(e, clip, track, 'right')} />
                      </div>);
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="playhead" style={{ left: 100 + playheadMs * pxPerMs, height: project.tracks.length * 56 + 24 }} />
          </div>
        </div>
      </div>
    </>
  );
};

const WaveformBg: React.FC<{ path: string; width: number; height: number }> = ({ path, width, height }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  React.useEffect(() => {
    const peaks = getCachedWaveform(path);
    if (!peaks || !ref.current) return;
    const c = ref.current; c.width = Math.max(1, width); c.height = height;
    const ctx = c.getContext('2d')!; ctx.clearRect(0, 0, c.width, c.height); ctx.fillStyle = 'rgba(255,255,255,0.35)';
    const step = c.width / peaks.length;
    for (let i = 0; i < peaks.length; i++) { const v = peaks[i]; const h = v * height * 0.9; ctx.fillRect(i * step, (height - h) / 2, Math.max(1, step - 0.5), h); }
  }, [path, width, height]);
  if (width <= 0) return null;
  return <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.5 }} />;
};

function formatTime(ms: number): string { const s = Math.floor(ms / 1000); const m = Math.floor(s / 60); return `${m}:${(s % 60).toString().padStart(2, '0')}`; }
