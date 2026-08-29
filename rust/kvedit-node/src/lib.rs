#![deny(clippy::all)]

use napi_derive::napi;
use std::path::Path;

#[napi]
pub fn new_project_json() -> napi::Result<String> {
    let p = kvedit_core::Project::new();
    p.to_json()
        .map_err(|e| napi::Error::from_reason(format!("JSON error: {}", e)))
}

#[napi]
pub fn parse_project_json(json: String) -> napi::Result<kvedit_core::Project> {
    kvedit_core::Project::from_json(&json)
        .map_err(|e| napi::Error::from_reason(format!("JSON error: {}", e)))
}

#[napi]
pub fn project_to_json(project: kvedit_core::Project) -> napi::Result<String> {
    project.to_json()
        .map_err(|e| napi::Error::from_reason(format!("JSON error: {}", e)))
}

#[napi]
pub fn total_duration_ms(project: kvedit_core::Project) -> u32 {
    project.total_duration_ms() as u32
}

#[napi]
pub fn detect_media_kind(path: String) -> napi::Result<String> {
    let kind = kvedit_media::detect_kind(Path::new(&path))
        .map_err(|e| napi::Error::from_reason(format!("detect error: {}", e)))?;
    Ok(match kind {
        kvedit_core::MediaKind::Video => "video".into(),
        kvedit_core::MediaKind::Audio => "audio".into(),
        kvedit_core::MediaKind::Image => "image".into(),
    })
}

#[napi]
pub fn build_export_args(
    project: kvedit_core::Project,
    settings_json: String,
) -> napi::Result<Vec<String>> {
    let settings: kvedit_export::ExportSettings = serde_json::from_str(&settings_json)
        .map_err(|e| napi::Error::from_reason(format!("settings JSON error: {}", e)))?;
    Ok(kvedit_export::build_ffmpeg_args(&project, &settings))
}

#[napi]
pub fn new_uuid() -> String {
    uuid::Uuid::new_v4().to_string()
}
