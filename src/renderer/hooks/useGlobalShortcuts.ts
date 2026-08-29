import { useEffect } from 'react';
import { useStore, findClip } from '../state/store';

export function useGlobalShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const s = useStore.getState();
      if (e.code === 'Space') { e.preventDefault(); s.togglePlay(); return; }
      if (e.key === 'j' || e.key === 'J') { s.setPlayhead(s.playheadMs - 1000); return; }
      if (e.key === 'k' || e.key === 'K') { s.pause(); return; }
      if (e.key === 'l' || e.key === 'L') { s.setPlayhead(s.playheadMs + 1000); return; }
      if (e.key === 'ArrowLeft') { s.setPlayhead(s.playheadMs - (e.shiftKey ? 1000 : 33)); return; }
      if (e.key === 'ArrowRight') { s.setPlayhead(s.playheadMs + (e.shiftKey ? 1000 : 33)); return; }
      if (e.key === 'b' || e.key === 'B') { if (s.selectedClipId) { const f = findClip(s.project, s.selectedClipId); if (f) s.splitClip(f.track.id, f.clip.id, s.playheadMs); } return; }
      if (e.key === 'Delete' || e.key === 'Backspace') { if (s.selectedClipId) { const f = findClip(s.project, s.selectedClipId); if (f) s.removeClip(f.track.id, f.clip.id); } return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); return; }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); return; }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
