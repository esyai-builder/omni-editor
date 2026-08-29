import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../state/store';
import { buildMediaAsset, generateThumbnail, generateWaveformPeaks } from '../../engine/media';
import { setCachedThumbnail, setCachedWaveform, getCachedThumbnail } from '../../engine/cache';
import type { MediaAsset, MediaKind } from '@shared/types';

export const MediaLibrary: React.FC = () => {
  const { t } = useTranslation();
  const media = useStore((s) => s.project.media);
  const addMedia = useStore((s) => s.addMedia);
  const removeMedia = useStore((s) => s.removeMedia);

  useEffect(() => {
    const handler = async (e: Event) => {
      const paths: string[] = (e as CustomEvent<string[]>).detail || [];
      if (paths.length === 0) return;
      for (const p of paths) {
        const kind = await window.kvedit.detectMediaKind(p) as MediaKind;
        const asset = await buildMediaAsset(p, kind);
        addMedia(asset);
        generateThumbnail(p, kind).then((dataUrl) => setCachedThumbnail(asset.id, dataUrl));
        if (kind === 'audio' || kind === 'video') generateWaveformPeaks(p, 1000).then((peaks) => setCachedWaveform(p, peaks));
      }
    };
    window.addEventListener('kvedit:import-paths', handler);
    return () => window.removeEventListener('kvedit:import-paths', handler);
  }, [addMedia]);

  const onDragStart = (e: React.DragEvent, asset: MediaAsset) => { e.dataTransfer.setData('application/x-kvedit-media', asset.id); e.dataTransfer.effectAllowed = 'copy'; };

  return (
    <>
      <div className="panel-header"><span>📁 {t('panels.library')}</span><div className="spacer" style={{ flex: 1 }} />
        <button onClick={async () => { const paths = await window.kvedit.pickMediaFiles(); if (paths) window.dispatchEvent(new CustomEvent('kvedit:import-paths', { detail: paths })); }} style={{ padding: '2px 8px', fontSize: 11 }}>+ Import</button>
      </div>
      <div className="panel-body">
        {media.length === 0 ? (
          <div className="media-empty"><div style={{ fontSize: 24, marginBottom: 8 }}>📂</div><div>{t('library.empty')}</div><div style={{ marginTop: 8, fontSize: 10 }}>MP4 · MOV · MP3 · WAV · PNG · JPG</div></div>
        ) : (
          <div className="media-list">{media.map((m) => <MediaItem key={m.id} asset={m} onDragStart={onDragStart} onRemove={() => removeMedia(m.id)} />)}</div>
        )}
      </div>
    </>
  );
};

const MediaItem: React.FC<{ asset: MediaAsset; onDragStart: (e: React.DragEvent, a: MediaAsset) => void; onRemove: () => void }> = ({ asset, onDragStart, onRemove }) => {
  const thumb = getCachedThumbnail(asset.id);
  return (
    <div className="media-item" draggable onDragStart={(e) => onDragStart(e, asset)} onContextMenu={(e) => { e.preventDefault(); if (confirm('Remove from library?')) onRemove(); }}>
      <div className="media-thumb">{thumb ? <img src={thumb} alt={asset.name} /> : <span>Loading...</span>}{asset.duration_ms > 0 && <div className="duration">{formatTime(asset.duration_ms)}</div>}</div>
      <div className="media-name" title={asset.name}>{asset.name}</div>
    </div>
  );
};

function formatTime(ms: number): string { const s = Math.floor(ms / 1000); const m = Math.floor(s / 60); return `${m}:${(s % 60).toString().padStart(2, '0')}`; }
