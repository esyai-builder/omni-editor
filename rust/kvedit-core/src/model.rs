use serde::{Deserialize, Serialize};
use uuid::Uuid;

pub type TrackId = Uuid;
pub type ClipId = Uuid;
pub type MediaId = Uuid;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum TrackKind {
    Video,
    Audio,
    Overlay,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum MediaKind {
    Video,
    Audio,
    Image,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MediaAsset {
    pub id: MediaId,
    pub kind: MediaKind,
    pub path: String,
    pub name: String,
    pub duration_ms: u64,
    pub width: u32,
    pub height: u32,
    pub fps: f32,
    pub has_audio: bool,
    pub thumbnail_path: Option<String>,
    pub waveform_path: Option<String>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
pub struct Point2D {
    pub x: f32,
    pub y: f32,
}

impl Default for Point2D {
    fn default() -> Self {
        Self { x: 0.0, y: 0.0 }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Keyframe {
    pub time_ms: u64,
    pub value: f32,
    #[serde(default)]
    pub position: Option<Point2D>,
    pub easing: Easing,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "snake_case")]
pub enum Easing {
    Linear,
    #[default]
    EaseInOut,
    EaseIn,
    EaseOut,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Transform {
    #[serde(default = "default_position")]
    pub position: Point2D,
    #[serde(default = "default_scale")]
    pub scale: f32,
    #[serde(default)]
    pub rotation: f32,
    #[serde(default = "default_opacity")]
    pub opacity: f32,
    pub keyframes: Vec<Keyframe>,
}

fn default_position() -> Point2D {
    Point2D { x: 960.0, y: 540.0 }
}
fn default_scale() -> f32 { 1.0 }
fn default_opacity() -> f32 { 1.0 }

impl Default for Transform {
    fn default() -> Self {
        Self {
            position: default_position(),
            scale: 1.0,
            rotation: 0.0,
            opacity: 1.0,
            keyframes: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColorAdjustment {
    #[serde(default)] pub brightness: f32,
    #[serde(default)] pub contrast: f32,
    #[serde(default)] pub saturation: f32,
    #[serde(default = "default_hue")] pub hue: f32,
    #[serde(default)] pub exposure: f32,
    #[serde(default)] pub lut_name: Option<String>,
}

fn default_hue() -> f32 { 0.0 }

impl Default for ColorAdjustment {
    fn default() -> Self {
        Self {
            brightness: 0.0, contrast: 0.0, saturation: 0.0,
            hue: 0.0, exposure: 0.0, lut_name: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Clip {
    pub id: ClipId,
    pub media_id: MediaId,
    pub start_ms: u64,
    pub duration_ms: u64,
    pub source_in_ms: u64,
    pub source_out_ms: u64,
    pub volume: f32,
    pub speed: f32,
    #[serde(default)]
    pub transform: Transform,
    #[serde(default)]
    pub color: ColorAdjustment,
    #[serde(default)]
    pub text: Option<TextOverlay>,
    pub transition_in_ms: u64,
    pub transition_out_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TextOverlay {
    pub content: String,
    pub font: String,
    pub size: f32,
    pub color: String,
    pub stroke: String,
    pub stroke_width: f32,
    pub shadow: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Track {
    pub id: TrackId,
    pub kind: TrackKind,
    pub name: String,
    pub enabled: bool,
    pub locked: bool,
    pub volume: f32,
    pub clips: Vec<Clip>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum TransitionKind {
    None,
    CrossDissolve,
    FadeToBlack,
    SlideLeft,
    SlideRight,
    WipeLeft,
    WipeRight,
    WipeUp,
    WipeDown,
}

impl Default for TransitionKind {
    fn default() -> Self { TransitionKind::None }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectSettings {
    pub name: String,
    pub width: u32,
    pub height: u32,
    pub fps: f32,
    pub sample_rate: u32,
    pub background_color: String,
}

impl Default for ProjectSettings {
    fn default() -> Self {
        Self {
            name: "Untitled".to_string(),
            width: 1920, height: 1080, fps: 30.0,
            sample_rate: 48000,
            background_color: "#000000".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub schema_version: u32,
    pub settings: ProjectSettings,
    pub media: Vec<MediaAsset>,
    pub tracks: Vec<Track>,
    pub created_at: String,
    pub updated_at: String,
}

impl Project {
    pub fn new() -> Self {
        let now = chrono::Utc::now().to_rfc3339();
        Self {
            schema_version: 1,
            settings: ProjectSettings::default(),
            media: Vec::new(),
            tracks: vec![
                Track {
                    id: Uuid::new_v4(), kind: TrackKind::Overlay,
                    name: "Overlay".into(), enabled: true, locked: false, volume: 1.0, clips: vec![],
                },
                Track {
                    id: Uuid::new_v4(), kind: TrackKind::Video,
                    name: "Video 1".into(), enabled: true, locked: false, volume: 1.0, clips: vec![],
                },
                Track {
                    id: Uuid::new_v4(), kind: TrackKind::Video,
                    name: "Video 2".into(), enabled: true, locked: false, volume: 1.0, clips: vec![],
                },
                Track {
                    id: Uuid::new_v4(), kind: TrackKind::Audio,
                    name: "Audio 1".into(), enabled: true, locked: false, volume: 1.0, clips: vec![],
                },
                Track {
                    id: Uuid::new_v4(), kind: TrackKind::Audio,
                    name: "Audio 2".into(), enabled: true, locked: false, volume: 1.0, clips: vec![],
                },
            ],
            created_at: now.clone(),
            updated_at: now,
        }
    }

    pub fn touch(&mut self) {
        self.updated_at = chrono::Utc::now().to_rfc3339();
    }

    pub fn total_duration_ms(&self) -> u64 {
        self.tracks.iter()
            .flat_map(|t| t.clips.iter())
            .map(|c| c.start_ms + c.duration_ms)
            .max()
            .unwrap_or(0)
    }

    pub fn to_json(&self) -> Result<String, serde_json::Error> {
        serde_json::to_string_pretty(self)
    }

    pub fn from_json(s: &str) -> Result<Self, serde_json::Error> {
        serde_json::from_str(s)
    }
}

impl Default for Project {
    fn default() -> Self { Self::new() }
}

#[derive(Debug, thiserror::Error)]
pub enum ProjectError {
    #[error("JSON serialization error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("Media not found: {0}")]
    MediaNotFound(MediaId),
    #[error("Track not found: {0}")]
    TrackNotFound(TrackId),
    #[error("Clip not found: {0}")]
    ClipNotFound(ClipId),
    #[error("Invalid operation: {0}")]
    Invalid(String),
}

pub type Result<T> = std::result::Result<T, ProjectError>;
