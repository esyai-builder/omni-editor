import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../state/store';
import { Titlebar } from './Titlebar';
import { MediaLibrary } from '../features/media-library/MediaLibrary';
import { Preview } from '../features/preview/Preview';
import { Timeline } from '../features/timeline/Timeline';
import { Properties } from '../features/properties/Properties';
import { Statusbar } from './Statusbar';
import { ExportDialog } from './ExportDialog';
import { Toast } from './Toast';
import { useGlobalShortcuts } from '../hooks/useGlobalShortcuts';
import { useAutosave } from '../hooks/useAutosave';

export const App: React.FC = () => {
  useTranslation();
  const showExportDialog = useStore((s) => s.showExportDialog);
  useGlobalShortcuts();
  useAutosave();
  return (
    <div className="app">
      <Titlebar />
      <div className="main">
        <div className="panel library"><MediaLibrary /></div>
        <div className="panel preview"><Preview /></div>
        <div className="panel timeline-panel"><Timeline /></div>
        <div className="panel properties"><Properties /></div>
      </div>
      <Statusbar />
      {showExportDialog && <ExportDialog />}
      <Toast />
    </div>
  );
};
