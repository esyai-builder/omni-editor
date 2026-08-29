import React from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../state/store';

export const Titlebar: React.FC = () => {
  const { t, i18n } = useTranslation();
  const project = useStore((s) => s.project);
  const dirty = useStore((s) => s.dirty);
  const projectPath = useStore((s) => s.projectPath);
  const newProject = useStore((s) => s.newProject);

  const handleNew = async () => {
    if (dirty && !confirm('Discard unsaved changes?')) return;
    newProject();
  };

  return (
    <div className="titlebar">
      <div className="brand">⏵ {t('app.name')}</div>
      <button onClick={handleNew} title={t('app.newProject')}>📄 New</button>
      <button onClick={async () => {
        if (!window.kvedit) return;
        const r = await window.kvedit.showSaveDialog({ title: 'Save Project As', defaultPath: 'untitled.kvedit', filters: [{ name: 'KVedit Project', extensions: ['kvedit'] }] });
        if (r) { await window.kvedit.saveProject(r, useStore.getState().project); useStore.getState().setProjectPath(r); useStore.getState().markClean(); }
      }}>💾 Save</button>
      <button onClick={async () => {
        if (!window.kvedit) return;
        const r = await window.kvedit.showOpenDialog({ title: 'Open Project', properties: ['openFile'], filters: [{ name: 'KVedit Project', extensions: ['kvedit'] }] });
        if (r && r[0]) {
          const json = await window.kvedit.loadProject(r[0]);
          try { const p = JSON.parse(json) as any; useStore.getState().setProject(p); useStore.getState().setProjectPath(r[0]); useStore.getState().markClean(); }
          catch { alert('Invalid project file'); }
        }
      }}>📂 Open</button>
      <button onClick={async () => {
        if (!window.kvedit) return;
        const paths = await window.kvedit.pickMediaFiles();
        if (paths) window.dispatchEvent(new CustomEvent('kvedit:import-paths', { detail: paths }));
      }}>📥 Import</button>
      <button onClick={() => useStore.getState().setShowExportDialog(true)}>📤 Export</button>
      <div className="spacer" />
      <div className="project-name">{project.settings.name}{dirty ? ' •' : ''}{projectPath ? `  (${projectPath})` : ''}</div>
      <select value={i18n.language} onChange={(e) => { i18n.changeLanguage(e.target.value); localStorage.setItem('kvedit.lang', e.target.value); }} style={{ background: 'var(--bg-3)', color: 'var(--fg-1)', border: '1px solid var(--border)', borderRadius: 4, padding: '4px 6px' }}>
        <option value="en">EN</option>
        <option value="id">ID</option>
      </select>
    </div>
  );
};
