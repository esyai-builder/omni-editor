import React from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../state/store';

export const Statusbar: React.FC = () => {
  const { t } = useTranslation();
  const project = useStore((s) => s.project);
  const dirty = useStore((s) => s.dirty);
  const total = project.tracks.flatMap(t => t.clips).reduce((m, c) => Math.max(m, c.start_ms + c.duration_ms), 0);
  const fmt = (ms: number) => { const s = Math.floor(ms / 1000); const m = Math.floor(s / 60); return `${m.toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}.${Math.floor((ms%1000)/10).toString().padStart(2,'0')}`; };
  return (
    <div className="statusbar">
      <span>{project.settings.width}×{project.settings.height} @ {project.settings.fps}fps</span>
      <span>•</span>
      <span>Duration: {fmt(total)}</span>
      <span>•</span>
      <span>Media: {project.media.length}</span>
      <span>•</span>
      <span>Clips: {project.tracks.reduce((s, t) => s + t.clips.length, 0)}</span>
      <div className="spacer" />
      <span style={{ color: dirty ? 'var(--warning)' : 'var(--success)' }}>{dirty ? t('status.dirty') : t('status.ready')}</span>
    </div>
  );
};
