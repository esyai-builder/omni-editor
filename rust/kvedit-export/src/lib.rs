use kvedit_core::Project;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportSettings {
    pub output_path: String,
    pub format: ExportFormat,
    pub width: u32,
    pub height: u32,
    pub fps: f32,
    pub video_bitrate_kbps: u32,
    pub audio_bitrate_kbps: u32,
    pub hardware_accel: HardwareAccel,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ExportFormat {
    Mp4H264,
    Mp4H265,
    WebmVp9,
    MovProres,
}

impl Default for ExportFormat {
    fn default() -> Self { Self::Mp4H264 }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum HardwareAccel {
    Auto,
    Nvenc,
    Qsv,
    Amf,
    None,
}

impl Default for HardwareAccel {
    fn default() -> Self { Self::Auto }
}

impl Default for ExportSettings {
    fn default() -> Self {
        Self {
            output_path: String::new(),
            format: ExportFormat::Mp4H264,
            width: 1920, height: 1080, fps: 30.0,
            video_bitrate_kbps: 8000, audio_bitrate_kbps: 192,
            hardware_accel: HardwareAccel::Auto,
        }
    }
}

/// Build an FFmpeg command-line invocation for the given project & settings.
/// The actual execution is done by the Node side (electron) using ffmpeg-static
/// or the wasm fallback. This function produces the args list as a vector of
/// strings, deterministic and testable.
pub fn build_ffmpeg_args(project: &Project, settings: &ExportSettings) -> Vec<String> {
    let mut args: Vec<String> = Vec::new();
    args.push("-y".into());
    args.push("-f".into()); args.push("lavfi".into());
    args.push("-i".into()); args.push(format!(
        "color=c={}:size={}x{}:rate={}:duration={}",
        project.settings.background_color,
        settings.width, settings.height, settings.fps,
        project.total_duration_ms() as f64 / 1000.0
    ));

    for track in &project.tracks {
        if !track.enabled { continue; }
        match track.kind {
            kvedit_core::TrackKind::Video | kvedit_core::TrackKind::Overlay => {
                for clip in &track.clips {
                    if let Some(media) = project.media.iter().find(|m| m.id == clip.media_id) {
                        args.push("-i".into());
                        args.push(media.path.clone());
                    }
                }
            }
            kvedit_core::TrackKind::Audio => {
                for clip in &track.clips {
                    if let Some(media) = project.media.iter().find(|m| m.id == clip.media_id) {
                        args.push("-i".into());
                        args.push(media.path.clone());
                    }
                }
            }
        }
    }

    args.push("-c:v".into());
    args.push(match (settings.format, settings.hardware_accel) {
        (ExportFormat::Mp4H264, HardwareAccel::Nvenc) => "h264_nvenc".into(),
        (ExportFormat::Mp4H264, HardwareAccel::Qsv) => "h264_qsv".into(),
        (ExportFormat::Mp4H264, HardwareAccel::Amf) => "h264_amf".into(),
        (ExportFormat::Mp4H264, _) => "libopenh264".into(),
        (ExportFormat::Mp4H265, HardwareAccel::Nvenc) => "hevc_nvenc".into(),
        (ExportFormat::Mp4H265, _) => "libx265".into(),
        (ExportFormat::WebmVp9, _) => "libvpx-vp9".into(),
        (ExportFormat::MovProres, _) => "prores_ks".into(),
    });
    args.push("-b:v".into()); args.push(format!("{}k", settings.video_bitrate_kbps));
    args.push("-c:a".into()); args.push("aac".into());
    args.push("-b:a".into()); args.push(format!("{}k", settings.audio_bitrate_kbps));
    args.push("-pix_fmt".into()); args.push("yuv420p".into());
    args.push(settings.output_path.clone());
    args
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn builds_args_with_background() {
        let p = Project::new();
        let s = ExportSettings::default();
        let args = build_ffmpeg_args(&p, &s);
        assert!(args.iter().any(|a| a == "-y"));
        assert!(args.iter().any(|a| a == "libopenh264"));
    }
}
