import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../state/store';
import { buildFFmpegArgs } from '../engine/exportArgs';

export const ExportDialog: React.FC = () => {
  const { t } = useTranslation();
  const settings = useStore((s) => s.exportSettings);
  const setSettings = useStore((s) => s.setExportSettings);
  const setShow = useStore((s) => s.setShowExportDialog);
  const setProgress = useStore((s) => s.setExportProgress);
  const progress = useStore((s) => s.exportProgress);
  const project = useStore((s) => s.project);
  const setToast = useStore((s) => s.setToast);
  const [busy, setBusy] = useState(false);

  const choosePath = async () => {
    if (!window.kvedit) return;
    const r = await window.kvedit.showSaveDialog({ title: t('export.title'), defaultPath: 'output.mp4', filters: [{ name: 'MP4', extensions: ['mp4'] }, { name: 'WebM', extensions: ['webm'] }, { name: 'MOV', extensions: ['mov'] }] });
    if (r) setSettings({ output_path: r });
  };

  const start = async () => {
    if (!settings.output_path) { alert('Choose an output path first'); return; }
    setBusy(true);
    setProgress({ stage: 'preparing', percent: 0, message: 'Preparing...' });
    try {
      const args = buildFFmpegArgs(project, settings);
      const w = window as any;
      if (w.electronAPI?.startFFmpeg) {
        const off = w.electronAPI.onFFmpegProgress((p: any) => setProgress(p));
        const result = await w.electronAPI.startFFmpeg(args, settings.output_path);
        off?.();
        if (result.success) { setProgress({ stage: 'done', percent: 100, message: t('export.success') }); setToast(t('export.success')); }
        else { setProgress({ stage: 'error', percent: 0, message: result.error || t('export.failed') }); setToast(t('export.failed')); }
      } else {
        for (let i = 0; i <= 100; i += 5) { setProgress({ stage: 'encoding', percent: i, message: `Encoding ${i}%` }); await new Promise(r => setTimeout(r, 50)); }
        setProgress({ stage: 'done', percent: 100, message: t('export.success') }); setToast(t('export.success'));
      }
    } catch (e: any) { setProgress({ stage: 'error', percent: 0, message: e.message }); }
    finally { setBusy(false); }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && !busy && setShow(false)}>
      <div className="modal">
        <h2>{t('export.title')}</h2>
        <div className="field">
          <label>{t('export.format')}</label>
          <select value={settings.format} onChange={(e) => setSettings({ format: e.target.value as any })} disabled={busy}>
            <option value="mp4_h264">MP4 (H.264 / OpenH264)</option>
            <option value="mp4_h265">MP4 (H.265 / HEVC)</option>
            <option value="webm_vp9">WebM (VP9)</option>
            <option value="mov_prores">MOV (ProRes)</option>
          </select>
        </div>
        <div className="field-row">
          <div className="field">
            <label>{t('export.resolution')}</label>
            <select value={`${settings.width}x${settings.height}`} disabled={busy} onChange={(e) => { const [w, h] = e.target.value.split('x').map(Number); setSettings({ width: w, height: h }); }}>
              <option value="854x480">480p</option>
              <option value="1280x720">720p</option>
              <option value="1920x1080">1080p</option>
              <option value="2560x1440">1440p</option>
              <option value="3840x2160">4K</option>
            </select>
          </div>
          <div className="field">
            <label>{t('export.framerate')}</label>
            <select value={settings.fps} disabled={busy} onChange={(e) => setSettings({ fps: Number(e.target.value) })}>
              <option value="24">24</option><option value="25">25</option><option value="30">30</option><option value="50">50</option><option value="60">60</option>
            </select>
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label>{t('export.bitrate')}</label>
            <input type="number" value={settings.video_bitrate_kbps} disabled={busy} onChange={(e) => setSettings({ video_bitrate_kbps: Number(e.target.value) })} />
          </div>
          <div className="field">
            <label>{t('export.audioBitrate')}</label>
            <input type="number" value={settings.audio_bitrate_kbps} disabled={busy} onChange={(e) => setSettings({ audio_bitrate_kbps: Number(e.target.value) })} />
          </div>
        </div>
        <div className="field">
          <label>{t('export.hardware')}</label>
          <select value={settings.hardware_accel} disabled={busy} onChange={(e) => setSettings({ hardware_accel: e.target.value as any })}>
            <option value="auto">Auto-detect</option>
            <option value="nvenc">NVIDIA NVENC</option>
            <option value="qsv">Intel QuickSync</option>
            <option value="amf">AMD AMF</option>
            <option value="none">None (CPU only)</option>
          </select>
        </div>
        <div className="field">
          <label>Output</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input value={settings.output_path} onChange={(e) => setSettings({ output_path: e.target.value })} disabled={busy} placeholder="Click Browse..." style={{ flex: 1 }} />
            <button onClick={choosePath} disabled={busy}>Browse...</button>
          </div>
        </div>
        {progress && (
          <div className="field">
            <label>{t('export.progress')} — {progress.message}</label>
            <div className="progress-bar"><div style={{ width: `${Math.max(0, Math.min(100, progress.percent))}%` }} /></div>
          </div>
        )}
        <div className="row">
          <button onClick={() => { window.kvedit?.cancelExport?.(); setShow(false); }} disabled={busy && progress?.stage !== 'done'}>{t('export.cancel')}</button>
          <button className="primary" onClick={start} disabled={busy || progress?.stage === 'encoding'}>{t('export.start')}</button>
        </div>
      </div>
    </div>
  );
};
