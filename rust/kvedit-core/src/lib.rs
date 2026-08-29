pub mod model;
pub mod command;

pub use model::*;
pub use command::*;

#[cfg(test)]
mod tests {
    use super::*;
    use uuid::Uuid;

    #[test]
    fn new_project_has_tracks() {
        let p = Project::new();
        assert!(p.tracks.len() >= 4);
        assert_eq!(p.schema_version, 1);
    }

    #[test]
    fn json_roundtrip() {
        let p = Project::new();
        let s = p.to_json().unwrap();
        let p2 = Project::from_json(&s).unwrap();
        assert_eq!(p.tracks.len(), p2.tracks.len());
        assert_eq!(p.schema_version, p2.schema_version);
    }

    #[test]
    fn add_media_undo_redo() {
        let mut p = Project::new();
        let mut stack = CommandStack::new(100);
        let asset = MediaAsset {
            id: Uuid::new_v4(),
            kind: MediaKind::Image,
            path: "test.png".into(),
            name: "test".into(),
            duration_ms: 5000, width: 1920, height: 1080,
            fps: 30.0, has_audio: false,
            thumbnail_path: None, waveform_path: None,
        };
        stack.execute(Box::new(AddMediaCmd { asset: asset.clone() }), &mut p).unwrap();
        assert_eq!(p.media.len(), 1);
        stack.undo(&mut p).unwrap();
        assert_eq!(p.media.len(), 0);
        stack.redo(&mut p).unwrap();
        assert_eq!(p.media.len(), 1);
    }

    #[test]
    fn split_clip_undo_redo() {
        let mut p = Project::new();
        let mut stack = CommandStack::new(100);
        let media_id = Uuid::new_v4();
        let cid = Uuid::new_v4();
        let track_id = p.tracks[1].id;
        let original = Clip {
            id: cid, media_id,
            start_ms: 0, duration_ms: 10000,
            source_in_ms: 0, source_out_ms: 10000,
            volume: 1.0, speed: 1.0,
            transform: Transform::default(),
            color: ColorAdjustment::default(),
            text: None,
            transition_in_ms: 0, transition_out_ms: 0,
        };
        let left = Clip { duration_ms: 4000, source_out_ms: 4000, ..original.clone() };
        let right = Clip {
            id: Uuid::new_v4(),
            start_ms: 4000, source_in_ms: 4000,
            ..original.clone()
        };
        stack.execute(Box::new(AddClipCmd { track_id, clip: original.clone() }), &mut p).unwrap();
        stack.execute(Box::new(SplitClipCmd {
            track_id, original, left: left.clone(), right: right.clone(),
        }), &mut p).unwrap();
        assert_eq!(p.tracks[1].clips.len(), 2);
        stack.undo(&mut p).unwrap();
        assert_eq!(p.tracks[1].clips.len(), 1);
    }
}
