import React from 'react';
import { useStore } from '../state/store';

export const Toast: React.FC = () => {
  const toast = useStore((s) => s.toast);
  const setToast = useStore((s) => s.setToast);
  React.useEffect(() => {
    if (toast) { const id = setTimeout(() => setToast(null), 2500); return () => clearTimeout(id); }
  }, [toast, setToast]);
  if (!toast) return null;
  return <div className="toast">{toast}</div>;
};
