# Plan: Windows Desktop Video/Image/Audio Editor (CapCut-Comparable MVP)

## Goal
Membangun editor desktop Windows open-source & gratis untuk video, image, dan audio, dengan fitur MVP fungsional yang sebanding dengan CapCut. Iterasi selanjutnya akan menambah AI effects dan template marketplace.

## Stack yang Dipilih
- **Shell/UI**: Electron (TypeScript + React)
- **Core engine**: Rust via napi-rs/N-API (timeline state, media decoding coordination, project file I/O)
- **Preview rendering**: WebCodecs (decode) + WebGL2 (composite/transform/color)
- **Export pipeline**: FFmpeg.wasm (encode) untuk portability; ffmpeg-static sidecar sebagai fallback untuk akselerasi hardware (NVENC/QSV)
- **Codec**: OpenH264 (encode H.264 royalty-free via Cisco), AV1 via libaom/svt-av1, AAC via fdk-aac (open fork)
- **Build/packaging**: electron-builder, NSIS installer + portable .exe
- **License**: MIT atau Apache-2.0

## Scope MVP (Iterasi 1)

### 1. Import & Media Management
- Import: MP4, MOV, MKV, WebM, JPG, PNG, WAV, MP3, AAC, FLAC
- Media library panel dengan thumbnail (image/video) dan waveform (audio)
- Proxy generation untuk file 4K agar preview lancar
- Drag-and-drop dari File Explorer

### 2. Timeline Multi-Track
- Minimal 4 video tracks + 2 audio tracks
- Track types: video, audio, overlay (text/image)
- Resolusi timeline: frame-accurate (configurable frame rate 24/30/60)
- Zoom in/out timeline, snapping
- Ripple/overwrite edit modes

### 3. Editing Operations
- Trim, split (razor), cut, copy, paste, delete
- Speed change (0.25x – 4x dengan pitch correction untuk audio)
- Reverse (video & audio)
- Volume keyframes per clip audio
- Opacity & transform keyframes (position, scale, rotation) per clip video/overlay

### 4. Color & Filter
- Built-in LUTs (.cube file load)
- Brightness, contrast, saturation, hue, exposure (real-time via WebGL shader)
- Color presets (cinematic, vintage, B&W)

### 5. Transisi & Efek
- Cross-dissolve, fade-to-black, slide, wipe (4 arah)
- Audio crossfade
- Durasi transisi configurable

### 6. Text & Overlay
- Text overlay dengan font system, size, color, stroke, shadow
- Image overlay (PNG dengan alpha, position/scale/rotation keyframes)
- Sticker/emoji (built-in SVG library)

### 7. Audio
- Multi-track mixing dengan volume per track & per clip
- Fade in/out, audio normalization
- Detach audio dari video clip
- Audio waveform display di timeline

### 8. Export
- Format: MP4 (H.264/AAC) atau WebM (VP9/Opus) atau MOV
- Resolusi: 480p, 720p, 1080p, 4K (jika source support)
- Frame rate: 24/30/60
- Quality preset: low/medium/high/custom bitrate
- Hardware acceleration auto-detect (NVENC/QSV/AMF) via ffmpeg sidecar
- Progress bar dengan cancel

### 9. Project File
- Format: JSON (`.kvedit` extension), versioned schema
- Auto-save tiap 30 detik ke `~/AppData/.../autosave/`
- Recent files list

### 10. UI/UX
- Dark theme by default, light theme optional
- Keyboard shortcuts (Ctrl+Z/Y, Space=play, J/K/L=transport, B=razor, C=cut, V=select)
- Resizable panels: media library, preview, timeline, properties
- Localization-ready (i18n via i18next), default English + Bahasa Indonesia

## Arsitektur

```
+--------------------------------------------------+
|  Electron Main Process (Node)                    |
|  - Window management                             |
|  - File system, dialogs                          |
|  - IPC routing                                   |
+----------------+---------------------------------+
                 | napi-rs bridge (Rust)
+----------------v---------------------------------+
|  Rust Core (kvedit-core crate)                   |
|  - Timeline/Project state (single source truth)  |
|  - Media probe (ffprobe wrapper)                 |
|  - Undo/redo command stack                       |
|  - Project JSON serialization                    |
|  - Export orchestration                          |
+----------------+---------------------------------+
                 | FFmpeg.wasm / ffmpeg-static
+----------------v---------------------------------+
|  Renderer Process (React + WebGL2)               |
|  - UI panels (React)                             |
|  - WebCodecs decoder pool                        |
|  - WebGL2 compositor for preview                 |
|  - Canvas2D for thumbnail/waveform generation    |
+--------------------------------------------------+
```

## Folder Structure (Target)

```
kvedit/
├── package.json
├── electron-builder.yml
├── tsconfig.json
├── rust/
│   ├── Cargo.toml (workspace)
│   ├── kvedit-core/        # timeline state, commands, serialization
│   ├── kvedit-media/       # probe, metadata extraction
│   ├── kvedit-export/      # FFmpeg orchestration
│   └── kvedit-node/        # napi-rs bindings
├── src/
│   ├── main/               # Electron main process
│   ├── preload/            # contextBridge IPC
│   ├── renderer/
│   │   ├── app/            # React root
│   │   ├── features/
│   │   │   ├── media-library/
│   │   │   ├── timeline/
│   │   │   ├── preview/    # WebGL2 compositor
│   │   │   ├── properties/
│   │   │   └── export/
│   │   ├── engine/
│   │   │   ├── decoder/    # WebCodecs wrappers
│   │   │   ├── compositor/ # WebGL2 shaders, transforms
│   │   │   └── shaders/    # GLSL fragment shaders
│   │   ├── state/          # Zustand stores, Rust sync
│   │   └── i18n/
│   └── shared/             # types shared main/renderer
├── assets/
│   ├── fonts/
│   ├── stickers/
│   └── luts/
└── docs/
    ├── ARCHITECTURE.md
    └── CONTRIBUTING.md
```

## Implementation Phases

### Phase 0 — Skeleton (1 iterasi)
1. Inisialisasi Electron + React + TypeScript + Vite
2. Setup rust workspace dengan napi-rs binding
3. Konfigurasi electron-builder untuk Windows (NSIS + portable)
4. Window dengan menu bar, dark theme, layout dasar (4-panel)
5. IPC: `open-file`, `save-project`, `load-project` (stub)

**Validation**: `npm run dev` membuka window; tombol menu About menampilkan versi.

### Phase 1 — Project & Media (1 iterasi)
1. Rust `Project` struct + JSON serialization (schema v1)
2. Rust `MediaClip` (probe via ffmpeg-static ffprobe)
3. UI: Media Library panel dengan drag-drop import
4. Thumbnail generation (video frame @ 1s via Canvas + WebCodecs)
5. Waveform generation (audio decode → peaks JSON di-cache)
6. Wire: import → simpan ke project state → tampil di library

**Validation**: Import 1 video + 1 image + 1 audio muncul di library dengan thumbnail/waveform; project tersimpan ke `.kvedit` dan reload berhasil.

### Phase 2 — Timeline & Preview (2 iterasi)
1. Rust timeline model: tracks, clips, keyframes
2. React timeline UI: ruler, track headers, clip blocks (zoom, scroll, snap)
3. Drag clip dari library ke timeline
4. Preview canvas: WebGL2 compositor dengan layered rendering
5. WebCodecs decoder pool: decode per clip sesuai playhead
6. Transport: play/pause/seek, frame stepping, J/K/L
7. Selection & move clip (drag di timeline)

**Validation**: Drag 2 video clip ke track 1, 1 audio ke track audio, tekan Play → preview menampilkan video komposit dengan audio sync.

### Phase 3 — Edit Operations (1 iterasi)
1. Trim (drag handle clip), split (B shortcut), delete
2. Cut/copy/paste (Ctrl+X/C/V)
3. Undo/redo (Rust command stack)
4. Speed change & reverse (audio pitch correction via soundtouch-js)
5. Volume keyframes (audio)
6. Transform & opacity keyframes (video/overlay)

**Validation**: Split clip di tengah, trim hasil split, undo 3x, redo 3x → state konsisten; volume fade in/out terdengar; transform keyframe preview animasi.

### Phase 4 — Color, Filter, Transition, Text (1 iterasi)
1. Color adjustment shader (fragment shader uniforms)
2. LUT loader (.cube parser di Rust, upload sebagai 3D texture)
3. Transisi dissolve/fade via crossfade shader
4. Text overlay React component → render ke Canvas2D → texture upload
5. Image overlay dengan alpha

**Validation**: Apply LUT "cinematic", transisi cross-dissolve 1 detik antar 2 clip, text "Hello" dengan stroke muncul di overlay track dan bergerak sesuai keyframe.

### Phase 5 — Audio Mixing (0.5 iterasi)
1. Track-level volume + clip-level volume
2. Audio waveform render di clip block
3. Audio crossfade antar clip di track yang sama
4. Normalization (peak detection saat import)

**Validation**: 3 audio clip di track berbeda, masing-masing volume berbeda, total mix terdengar benar, waveform visible di timeline.

### Phase 6 — Export (1 iterasi)
1. Export dialog (resolution, framerate, bitrate, format)
2. Rust export orchestrator: build FFmpeg filter graph dari timeline state
3. Hardware acceleration auto-detect (NVENC/QSV/AMF probe)
4. Progress reporting via IPC
5. Cancel support
6. Output ke user-selected path

**Validation**: Export project 1080p 30fps 30 detik dengan 3 clip + text + transisi → file MP4 playable di Windows Media Player; 4K project dengan 5 clip juga export tanpa crash.

### Phase 7 — Polish (1 iterasi)
1. Keyboard shortcut map lengkap
2. Auto-save (setiap 30 detik, recovery prompt)
3. Recent files
4. i18n: English + Bahasa Indonesia
5. Error handling & user-facing messages
6. Onboarding (first-run tip card)
7. README + user guide singkat

**Validation**: Fresh user tanpa docs bisa import → edit 30 detik clip → export dalam <10 menit. Crash recovery dari autosave berhasil.

## Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|--------|--------|----------|
| WebCodecs availability di Electron Chromium | Preview gagal | Fallback ke `<video>` + `<audio>` element; document minimum Chromium version |
| FFmpeg.wasm lambat untuk 4K export | User experience buruk | Pakai ffmpeg-static sidecar (native) sebagai default, FFmpeg.wasm hanya sebagai fallback |
| WebGL2 shader compatibility antar GPU | Filter/effect glitch | Test di Intel UHD, NVIDIA, AMD; gunakan presisi mediump; fallback ke software path |
| Patent H.264 jika pakai x264 | Legal risk | Wajib OpenH264 (Cisco license) atau AV1 |
| Drag-drop import untuk folder besar | UI freeze | Streaming probe di Rust worker; thumbnail lazy-load |
| Project JSON bengkak untuk 1 jam video | Load lama | Binary chunking atau sqlite-backed project file di iterasi 2 |

## Validation Plan (per phase sudah ada di atas; ringkasan di sini)
- **Unit tests**: Rust (`cargo test`) untuk timeline ops, project serialization, FFmpeg command builder
- **Integration tests**: `vitest` + Playwright untuk UI flows
- **Manual smoke test** per phase checklist
- **Codec compatibility test**: export → play di VLC, Windows Media Player, Chrome
- **Performance benchmark**: 1080p project 5 menit dengan 4 track harus preview ≥30fps; export 1080p harus ≤2x real-time di mid-range laptop (i5-1135G7, Iris Xe)

## Out of Scope (Iterasi Mendatang)
- AI features: background removal, auto-captions, style transfer
- Template marketplace & cloud sync
- Motion tracking, chroma key
- Collaboration (multi-user)
- Mobile/tablet version
- 8K editing
- Plugin/extension system

## Open Questions (untuk klarifikasi saat implementasi)
1. Apakah nama produk final sudah ada, atau pakai working name `KVEdi`t?
2. Apakah komunitas yang dimaksud punya channel distribusi (GitHub Releases? Discord? Internal share)?
3. Apakah perlu code signing certificate untuk Windows (menghindari SmartScreen warning)? — biaya ~$200/tahun via DigiCert/Sectigo
4. Apakah perlu MSI installer untuk enterprise deployment, atau NSIS cukup?

## Decisions Log (Confirmed)
- Electron + TypeScript/React (bukan Tauri) — untuk performa GPU pipeline
- MVP fungsional dulu, AI/template di iterasi berikut
- WebCodecs preview + FFmpeg.wasm/native hybrid export
- Distribusi open source gratis untuk komunitas
- Codec: OpenH264 (royalty-free) + AV1
- WebGL2 untuk compositing (bukan native GPU addon di iterasi 1)
- Core state di Rust (single source of truth), UI di React
