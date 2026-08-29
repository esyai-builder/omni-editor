import { useEffect, useRef } from 'react';
import { useStore } from '../state/store';

export function useAutosave() {
  const dirty = useStore((s) => s.dirty);
  const project = useStore((s) => s.project);
  const last = useRef<number>(0);
  useEffect(() => {
    if (!dirty) return;
    const id = setInterval(() => {
      const now = Date.now();
      if (now - last.current < 25000) return;
      last.current = now;
      if (window.kvedit) { window.kvedit.autosaveProject(project); useStore.getState().setToast('Auto-saved'); }
    }, 5000);
    return () => clearInterval(id);
  }, [dirty, project]);
}
