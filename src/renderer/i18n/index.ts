import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: { translation: {
    app: { name: 'KVedit', newProject: 'New Project', openProject: 'Open Project', saveProject: 'Save Project', saveAs: 'Save As', import: 'Import Media', export: 'Export' },
    panels: { library: 'Media Library', preview: 'Preview', timeline: 'Timeline', properties: 'Properties' },
    timeline: { play: 'Play', pause: 'Pause', stop: 'Stop', split: 'Split (B)', cut: 'Cut (Ctrl+X)', copy: 'Copy (Ctrl+C)', paste: 'Paste (Ctrl+V)', delete: 'Delete', undo: 'Undo', redo: 'Redo', zoom: 'Zoom' },
    library: { empty: 'Drag media here or use Ctrl+I', video: 'Video', audio: 'Audio', image: 'Image' },
    properties: { transform: 'Transform', color: 'Color', audio: 'Audio', text: 'Text', nothing: 'Select a clip to edit properties', position: 'Position', scale: 'Scale', rotation: 'Rotation', opacity: 'Opacity', volume: 'Volume', speed: 'Speed' },
    export: { title: 'Export Project', format: 'Format', resolution: 'Resolution', framerate: 'Frame Rate', bitrate: 'Video Bitrate (kbps)', audioBitrate: 'Audio Bitrate (kbps)', hardware: 'Hardware Acceleration', start: 'Start Export', cancel: 'Cancel', progress: 'Progress', success: 'Export complete', failed: 'Export failed' },
    status: { ready: 'Ready', saved: 'Saved', dirty: 'Modified', autosaved: 'Auto-saved' },
    confirm: { yes: 'Yes', no: 'No', ok: 'OK', cancel: 'Cancel' },
  } },
  id: { translation: {
    app: { name: 'KVedit', newProject: 'Proyek Baru', openProject: 'Buka Proyek', saveProject: 'Simpan Proyek', saveAs: 'Simpan Sebagai', import: 'Impor Media', export: 'Ekspor' },
    panels: { library: 'Pustaka Media', preview: 'Pratinjau', timeline: 'Lini Masa', properties: 'Properti' },
    timeline: { play: 'Putar', pause: 'Jeda', stop: 'Berhenti', split: 'Pisah (B)', cut: 'Potong (Ctrl+X)', copy: 'Salin (Ctrl+C)', paste: 'Tempel (Ctrl+V)', delete: 'Hapus', undo: 'Urungkan', redo: 'Ulangi', zoom: 'Perbesar' },
    library: { empty: 'Tarik media ke sini atau gunakan Ctrl+I', video: 'Video', audio: 'Audio', image: 'Gambar' },
    properties: { transform: 'Transformasi', color: 'Warna', audio: 'Audio', text: 'Teks', nothing: 'Pilih klip untuk menyunting properti', position: 'Posisi', scale: 'Skala', rotation: 'Rotasi', opacity: 'Opasitas', volume: 'Volume', speed: 'Kecepatan' },
    export: { title: 'Ekspor Proyek', format: 'Format', resolution: 'Resolusi', framerate: 'Frame Rate', bitrate: 'Bitrate Video (kbps)', audioBitrate: 'Bitrate Audio (kbps)', hardware: 'Akselerasi Hardware', start: 'Mulai Ekspor', cancel: 'Batal', progress: 'Progres', success: 'Ekspor selesai', failed: 'Ekspor gagal' },
    status: { ready: 'Siap', saved: 'Tersimpan', dirty: 'Diubah', autosaved: 'Tersimpan otomatis' },
    confirm: { yes: 'Ya', no: 'Tidak', ok: 'OK', cancel: 'Batal' },
  } },
};

const stored = (typeof window !== 'undefined' && localStorage.getItem('kvedit.lang')) || 'en';

i18n.use(initReactI18next).init({
  resources, lng: stored, fallbackLng: 'en', interpolation: { escapeValue: false },
});

export default i18n;
