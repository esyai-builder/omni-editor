import React from 'react';
import { useTranslation } from 'react-i18next';
import { useStore, findClip } from '../../state/store';
import type { Clip } from '@shared/types';

export const Properties: React.FC = () => {
  const { t } = useTranslation();
  const project = useStore((s) => s.project);
  const selectedClipId = useStore((s) => s.selectedClipId);
  const updateClip = useStore((s) => s.updateClip);
  const found = selectedClipId ? findClip(project, selectedClipId) : null;

  if (!found) return (
    <>
      <div className="panel-header">⚙ {t('panels.properties')}</div>
      <div className="empty-properties">{t('properties.nothing')}</div>
    </>
  );

  const { track, clip } = found;
  const set = (patch: Partial<Clip>) => updateClip(track.id, clip.id, patch);
  const setTrans = (patch: Partial<typeof clip.transform>) => set({ transform: { ...clip.transform, ...patch } });
  const setColor = (patch: Partial<typeof clip.color>) => set({ color: { ...clip.color, ...patch } });
  const setText = (patch: Partial<NonNullable<typeof clip.text>>) => set({ text: { ...(clip.text || defaultText()), ...patch } });

  return (
    <>
      <div className="panel-header">⚙ {t('panels.properties')} — {track.name}</div>
      <div className="panel-body">
        <div className="properties-form">
          <Section title={t('properties.transform')}>
            <Row2>
              <NumberField label={t('properties.position') + ' X'} value={clip.transform.position.x} onChange={(v) => setTrans({ position: { ...clip.transform.position, x: v } })} />
              <NumberField label={t('properties.position') + ' Y'} value={clip.transform.position.y} onChange={(v) => setTrans({ position: { ...clip.transform.position, y: v } })} />
            </Row2>
            <SliderField label={t('properties.scale')} min={0.1} max={3} step={0.01} value={clip.transform.scale} onChange={(v) => setTrans({ scale: v })} />
            <SliderField label={t('properties.rotation')} min={-180} max={180} step={1} value={clip.transform.rotation} onChange={(v) => setTrans({ rotation: v })} />
            <SliderField label={t('properties.opacity')} min={0} max={1} step={0.01} value={clip.transform.opacity} onChange={(v) => setTrans({ opacity: v })} />
          </Section>
          <Section title={t('properties.color')}>
            <SliderField label="Brightness" min={-1} max={1} step={0.01} value={clip.color.brightness} onChange={(v) => setColor({ brightness: v })} />
            <SliderField label="Contrast" min={-1} max={1} step={0.01} value={clip.color.contrast} onChange={(v) => setColor({ contrast: v })} />
            <SliderField label="Saturation" min={-1} max={1} step={0.01} value={clip.color.saturation} onChange={(v) => setColor({ saturation: v })} />
            <SliderField label="Exposure" min={-1} max={1} step={0.01} value={clip.color.exposure} onChange={(v) => setColor({ exposure: v })} />
            <SliderField label="Hue" min={0} max={360} step={1} value={clip.color.hue} onChange={(v) => setColor({ hue: v })} />
            <div className="field">
              <label>LUT Preset</label>
              <select value={clip.color.lut_name || ''} onChange={(e) => setColor({ lut_name: e.target.value || null })}>
                <option value="">None</option>
                <option value="cinematic">Cinematic</option>
                <option value="vintage">Vintage</option>
                <option value="bw">Black &amp; White</option>
                <option value="warm">Warm</option>
                <option value="cool">Cool</option>
              </select>
            </div>
          </Section>
          <Section title={t('properties.audio')}>
            <SliderField label={t('properties.volume')} min={0} max={2} step={0.01} value={clip.volume} onChange={(v) => set({ volume: v })} />
            <SliderField label={t('properties.speed')} min={0.25} max={4} step={0.05} value={clip.speed} onChange={(v) => set({ speed: v })} />
          </Section>
          {track.kind === 'overlay' && (
            <Section title={t('properties.text')}>
              <div className="field"><label>Content</label><input value={clip.text?.content || ''} onChange={(e) => setText({ content: e.target.value })} /></div>
              <Row2>
                <div className="field"><label>Font</label><select value={clip.text?.font || 'Arial'} onChange={(e) => setText({ font: e.target.value })}><option>Arial</option><option>Helvetica</option><option>Times New Roman</option><option>Courier New</option><option>Verdana</option><option>Georgia</option></select></div>
                <NumberField label="Size" value={clip.text?.size || 48} min={8} max={500} onChange={(v) => setText({ size: v })} />
              </Row2>
              <Row2>
                <div className="field"><label>Color</label><input type="color" value={clip.text?.color || '#ffffff'} onChange={(e) => setText({ color: e.target.value })} /></div>
                <div className="field"><label>Stroke</label><input type="color" value={clip.text?.stroke || '#000000'} onChange={(e) => setText({ stroke: e.target.value })} /></div>
              </Row2>
            </Section>
          )}
          <Section title="Timing">
            <Row2><NumberField label="Start (ms)" value={clip.start_ms} onChange={(v) => set({ start_ms: Math.max(0, v) })} /><NumberField label="Duration (ms)" value={clip.duration_ms} onChange={(v) => set({ duration_ms: Math.max(100, v) })} /></Row2>
            <Row2><NumberField label="In (ms)" value={clip.source_in_ms} onChange={(v) => set({ source_in_ms: Math.max(0, v) })} /><NumberField label="Out (ms)" value={clip.source_out_ms} onChange={(v) => set({ source_out_ms: Math.max(0, v) })} /></Row2>
          </Section>
        </div>
      </div>
    </>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 4, padding: 8 }}>
    <div style={{ fontSize: 10, color: 'var(--fg-2)', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.5 }}>{title}</div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</div>
  </div>
);
const Row2: React.FC<{ children: React.ReactNode }> = ({ children }) => <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>{children}</div>;
const NumberField: React.FC<{ label: string; value: number; min?: number; max?: number; step?: number; onChange: (v: number) => void }> = ({ label, value, min, max, step = 1, onChange }) => (
  <div className="field"><label>{label}</label><input type="number" value={Math.round(value * 100) / 100} min={min} max={max} step={step} onChange={(e) => onChange(Number(e.target.value))} /></div>
);
const SliderField: React.FC<{ label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }> = ({ label, value, min, max, step, onChange }) => (
  <div className="field"><label>{label} <span style={{ float: 'right' }}>{typeof value === 'number' ? value.toFixed(2) : value}</span></label><input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} /></div>
);
function defaultText() { return { content: 'Text', font: 'Arial', size: 48, color: '#ffffff', stroke: '#000000', stroke_width: 2, shadow: true }; }
