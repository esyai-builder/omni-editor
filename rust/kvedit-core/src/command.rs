use uuid::Uuid;
use crate::model::*;
use crate::Result;

pub trait Command {
    fn apply(&self, project: &mut Project) -> Result<()>;
    fn revert(&self, project: &mut Project) -> Result<()>;
    fn description(&self) -> &str;
}

pub struct CommandStack {
    undo: Vec<Box<dyn Command>>,
    redo: Vec<Box<dyn Command>>,
    capacity: usize,
}

impl CommandStack {
    pub fn new(capacity: usize) -> Self {
        Self { undo: Vec::new(), redo: Vec::new(), capacity }
    }

    pub fn execute(&mut self, mut cmd: Box<dyn Command>, project: &mut Project) -> Result<()> {
        cmd.apply(project)?;
        self.undo.push(cmd);
        if self.undo.len() > self.capacity {
            self.undo.remove(0);
        }
        self.redo.clear();
        project.touch();
        Ok(())
    }

    pub fn undo(&mut self, project: &mut Project) -> Result<bool> {
        if let Some(cmd) = self.undo.pop() {
            cmd.revert(project)?;
            self.redo.push(cmd);
            project.touch();
            Ok(true)
        } else { Ok(false) }
    }

    pub fn redo(&mut self, project: &mut Project) -> Result<bool> {
        if let Some(cmd) = self.redo.pop() {
            cmd.apply(project)?;
            self.undo.push(cmd);
            project.touch();
            Ok(true)
        } else { Ok(false) }
    }

    pub fn can_undo(&self) -> bool { !self.undo.is_empty() }
    pub fn can_redo(&self) -> bool { !self.redo.is_empty() }
}

// ---- Concrete Commands ----

pub struct AddMediaCmd {
    pub asset: MediaAsset,
}
impl Command for AddMediaCmd {
    fn apply(&self, p: &mut Project) -> Result<()> { p.media.push(self.asset.clone()); Ok(()) }
    fn revert(&self, p: &mut Project) -> Result<()> {
        p.media.retain(|m| m.id != self.asset.id);
        Ok(())
    }
    fn description(&self) -> &str { "Add media" }
}

pub struct AddClipCmd {
    pub track_id: TrackId,
    pub clip: Clip,
}
impl Command for AddClipCmd {
    fn apply(&self, p: &mut Project) -> Result<()> {
        let track = p.tracks.iter_mut()
            .find(|t| t.id == self.track_id)
            .ok_or(ProjectError::TrackNotFound(self.track_id))?;
        track.clips.push(self.clip.clone());
        Ok(())
    }
    fn revert(&self, p: &mut Project) -> Result<()> {
        let track = p.tracks.iter_mut()
            .find(|t| t.id == self.track_id)
            .ok_or(ProjectError::TrackNotFound(self.track_id))?;
        track.clips.retain(|c| c.id != self.clip.id);
        Ok(())
    }
    fn description(&self) -> &str { "Add clip" }
}

pub struct RemoveClipCmd {
    pub track_id: TrackId,
    pub clip: Clip,
    pub index: usize,
}
impl Command for RemoveClipCmd {
    fn apply(&self, p: &mut Project) -> Result<()> {
        let track = p.tracks.iter_mut()
            .find(|t| t.id == self.track_id)
            .ok_or(ProjectError::TrackNotFound(self.track_id))?;
        track.clips.retain(|c| c.id != self.clip.id);
        Ok(())
    }
    fn revert(&self, p: &mut Project) -> Result<()> {
        let track = p.tracks.iter_mut()
            .find(|t| t.id == self.track_id)
            .ok_or(ProjectError::TrackNotFound(self.track_id))?;
        track.clips.insert(self.index.min(track.clips.len()), self.clip.clone());
        Ok(())
    }
    fn description(&self) -> &str { "Remove clip" }
}

pub struct SplitClipCmd {
    pub track_id: TrackId,
    pub original: Clip,
    pub left: Clip,
    pub right: Clip,
}
impl Command for SplitClipCmd {
    fn apply(&self, p: &mut Project) -> Result<()> {
        let track = p.tracks.iter_mut()
            .find(|t| t.id == self.track_id)
            .ok_or(ProjectError::TrackNotFound(self.track_id))?;
        if let Some(pos) = track.clips.iter().position(|c| c.id == self.original.id) {
            track.clips.remove(pos);
            track.clips.insert(pos, self.right.clone());
            track.clips.insert(pos, self.left.clone());
        }
        Ok(())
    }
    fn revert(&self, p: &mut Project) -> Result<()> {
        let track = p.tracks.iter_mut()
            .find(|t| t.id == self.track_id)
            .ok_or(ProjectError::TrackNotFound(self.track_id))?;
        if let Some(pos) = track.clips.iter().position(|c| c.id == self.left.id) {
            track.clips.remove(pos);
            track.clips.remove(pos);
            track.clips.insert(pos, self.original.clone());
        }
        Ok(())
    }
    fn description(&self) -> &str { "Split clip" }
}

pub struct UpdateClipCmd {
    pub track_id: TrackId,
    pub clip_id: ClipId,
    pub before: Clip,
    pub after: Clip,
}
impl Command for UpdateClipCmd {
    fn apply(&self, p: &mut Project) -> Result<()> {
        let track = p.tracks.iter_mut()
            .find(|t| t.id == self.track_id)
            .ok_or(ProjectError::TrackNotFound(self.track_id))?;
        if let Some(c) = track.clips.iter_mut().find(|c| c.id == self.clip_id) {
            *c = self.after.clone();
        }
        Ok(())
    }
    fn revert(&self, p: &mut Project) -> Result<()> {
        let track = p.tracks.iter_mut()
            .find(|t| t.id == self.track_id)
            .ok_or(ProjectError::TrackNotFound(self.track_id))?;
        if let Some(c) = track.clips.iter_mut().find(|c| c.id == self.clip_id) {
            *c = self.before.clone();
        }
        Ok(())
    }
    fn description(&self) -> &str { "Update clip" }
}

pub fn new_clip_id() -> ClipId { Uuid::new_v4() }
