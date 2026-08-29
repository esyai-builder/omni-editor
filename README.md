# KVedit

Open-source video, image, and audio editor for Windows. CapCut-comparable MVP, written in Electron + TypeScript + Rust + WebGL2.

## Stack
- **Shell**: Electron 28 + TypeScript + React
- **Core**: Rust (timeline state, project serialization, undo/redo command stack)
- **Preview**: WebCodecs + WebGL2 compositor
- **Export**: FFmpeg (H.264 via OpenH264, AV1, VP9, H.265)
- **Build**: Vite + electron-builder (NSIS installer + portable .exe)

## Project Structure
```
src/
  main/          Electron main process
  preload/       IPC bridge (contextIsolation-safe)
  renderer/      React UI
    app/         App shell, titlebar, statusbar, export dialog
    state/       Zustand store
    features/    Media library, preview, timeline, properties
    engine/      decoder (WebCodecs), compositor (WebGL2), media probe, cache, export args builder
    hooks/       global shortcuts, autosave
    i18n/        English & Bahasa Indonesia
  shared/        Shared TypeScript types (IPC contract)
rust/
  kvedit-core/   Timeline & project state, command stack
  kvedit-media/  Media probing
  kvedit-export/ FFmpeg args builder
  kvedit-node/   napi-rs bindings (optional native module)
```

## Setup
```sh
npm install
npm run build:rust
```

## Develop
```sh
npm run dev
```

## Build Windows installer
```sh
npm run package:win
```
Produces `release/KVedit-<version>-x64.exe` (NSIS installer) and portable .exe.

## Test
```sh
npm test            # vitest
npm run test:rust   # cargo test for kvedit-core command stack
```

## Features in MVP
- Multi-track timeline (overlay, 2 video, 2 audio)
- Drag-drop import (MP4, MOV, MKV, WebM, MP3, WAV, AAC, FLAC, PNG, JPG)
- Thumbnail + waveform auto-generation
- Trim handles, split (B), delete, drag to move
- WebGL2 preview with real-time color adjustments
- Keyframed transform (position, scale, rotation, opacity)
- Text overlay with font, color, stroke
- Audio mixing per track & per clip, volume & speed
- Export MP4/WebM/MOV via bundled FFmpeg, OpenH264 for H.264
- i18n: English + Bahasa Indonesia
- Auto-save every 30s
- Hardware accel auto-detect (NVENC/QSV/AMF)

## License
MIT
