use kvedit_core::{MediaAsset, MediaKind};
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, thiserror::Error)]
pub enum MediaError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("Probe error: {0}")]
    Probe(String),
    #[error("Unsupported format: {0}")]
    Unsupported(String),
}

pub type Result<T> = std::result::Result<T, MediaError>;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProbeResult {
    pub duration_ms: u64,
    pub width: u32,
    pub height: u32,
    pub fps: f32,
    pub has_video: bool,
    pub has_audio: bool,
    pub audio_sample_rate: u32,
    pub audio_channels: u8,
    pub video_codec: Option<String>,
    pub audio_codec: Option<String>,
}

pub fn detect_kind(path: &Path) -> Result<MediaKind> {
    let ext = path.extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_ascii_lowercase())
        .unwrap_or_default();
    Ok(match ext.as_str() {
        "mp4" | "mov" | "mkv" | "webm" | "avi" | "m4v" => MediaKind::Video,
        "mp3" | "wav" | "aac" | "flac" | "ogg" | "m4a" => MediaKind::Audio,
        "jpg" | "jpeg" | "png" | "bmp" | "gif" | "webp" | "tiff" => MediaKind::Image,
        _ => return Err(MediaError::Unsupported(format!("Unknown extension: {}", ext))),
    })
}

pub fn probe_with_ffprobe(_path: &Path) -> Result<ProbeResult> {
    // Real implementation shells out to ffprobe-static; for portability we
    // return an unprobed result and let the renderer (WebCodecs) extract
    // metadata. This avoids hard-binding Rust to a specific ffprobe binary.
    Ok(ProbeResult {
        duration_ms: 0, width: 0, height: 0, fps: 0.0,
        has_video: false, has_audio: false,
        audio_sample_rate: 48000, audio_channels: 2,
        video_codec: None, audio_codec: None,
    })
}

pub fn build_asset_stub(path: &Path, kind: MediaKind) -> Result<MediaAsset> {
    let name = path.file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("untitled")
        .to_string();
    Ok(MediaAsset {
        id: uuid::Uuid::new_v4(),
        kind, path: path.to_string_lossy().into_owned(),
        name, duration_ms: 0, width: 0, height: 0, fps: 0.0,
        has_audio: matches!(kind, MediaKind::Video),
        thumbnail_path: None, waveform_path: None,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn detect_kinds() {
        assert_eq!(detect_kind(&PathBuf::from("a.mp4")).unwrap(), MediaKind::Video);
        assert_eq!(detect_kind(&PathBuf::from("a.mp3")).unwrap(), MediaKind::Audio);
        assert_eq!(detect_kind(&PathBuf::from("a.PNG")).unwrap(), MediaKind::Image);
    }
}
