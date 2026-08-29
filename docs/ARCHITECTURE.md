# Architecture

## Layered Design

```
+--------------------------------------------------------+
|  Renderer (React + WebGL2)                             |
|  - UI panels, transport, timeline                      |
|  - Compositor (WebGL2) for real-time preview           |
|  - Decoder pool (WebCodecs fallback to <video>)        |
+-----------------+--------------------------------------+
                  | contextBridge IPC
+-----------------v--------------------------------------+
|  Preload (TypeScript)                                  |
|  - IpcApi typed surface                                |
+-----------------+--------------------------------------+
                  | ipcMain handlers
+-----------------v--------------------------------------+
|  Main Process (Node)                                   |
|  - File I/O, dialogs                                   |
|  - FFmpeg orchestration (spawn, progress, cancel)      |
|  - ffprobe-static metadata                             |
+-----------------+--------------------------------------+
                  | (optional, future)
+-----------------v--------------------------------------+
|  Rust Core (napi-rs binding)                           |
|  - Project model (single source of truth)              |
|  - Command stack for undo/redo                         |
|  - JSON serialization                                  |
+--------------------------------------------------------+
```

## Data Flow

1. **Import** — User picks files → IPC `pickMediaFiles` → for each file, main `media:probe` runs ffprobe → renderer stores `MediaAsset` in Zustand store → thumbnail & waveform generated in renderer.
2. **Edit** — Drag clip to timeline → Zustand mutates `project.tracks[i].clips` → React re-renders → compositor draws next frame.
3. **Preview** — Each animation frame: query `activeClipsAtTime(timeMs)`, for each layer upload texture to WebGL2, draw with transform/color uniforms.
4. **Export** — Click Export → dialog → build FFmpeg args in renderer → IPC `export:start` → main spawns ffmpeg-static → progress reported via `export:progress` event → done.

## Project State

`src/shared/types.ts` is the canonical TypeScript shape. `rust/kvedit-core/src/model.rs` is the canonical Rust shape. They are kept in sync manually for MVP; a future `ts-rs` or `specta` generation step is planned.

## Why WebGL2 (not WebGPU)
- Available in stable Chromium 90+ shipped with Electron 28
- Sufficient performance for 1080p 30fps preview with 4-5 layers
- Simpler shader pipeline; ready today

## Why OpenH264 (not x264)
- x264 is GPL-ish and has MPEG LA patent encumbrances
- OpenH264 is BSD-licensed and distributed free by Cisco
- Quality is comparable at typical bitrates (5-15 Mbps)

## Limitations of MVP
- Undo/redo is conceptual (commands not yet wired through Zustand); will be backed by Rust `CommandStack` in v0.2
- Export does simple stream copy of first video track + audio track; full filter-graph compositing of N layers is the v0.2 milestone
- No real-time GPU LUT sampling yet (presets stored as names, not 3D textures)
- No motion tracking, chroma key, or AI features (planned post-MVP)
