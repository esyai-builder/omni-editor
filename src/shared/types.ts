export type Uuid = string;

export type TrackKind = 'video' | 'audio' | 'overlay';
export type MediaKind = 'video' | 'audio' | 'image';
export type Easing = 'linear' | 'ease_in_out' | 'ease_in' | 'ease_out';
export type TransitionKind =
  | 'none'
  | 'cross_dissolve'
  | 'fade_to_black'
  | 'slide_left'
  | 'slide_right'
  | 'wipe_left'
  | 'wipe_right'
  | 'wipe_up'
  | 'wipe_down';

export interface Point2D {
  x: number;
  y: number;
}

export interface Keyframe {
  time_ms: number;
  value: number;
  position?: Point2D;
  easing: Easing;
}

export interface Transform {
  position: Point2D;
  scale: number;
  rotation: number;
  opacity: number;
  keyframes: Keyframe[];
}

export interface ColorAdjustment {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  exposure: number;
  lut_name?: string | null;
}

export interface TextOverlay {
  content: string;
  font: string;
  size: number;
  color: string;
  stroke: string;
  stroke_width: number;
  shadow: boolean;
}

export interface MediaAsset {
  id: Uuid;
  kind: MediaKind;
  path: string;
  name: string;
  duration_ms: number;
  width: number;
  height: number;
  fps: number;
  has_audio: boolean;
  thumbnail_path?: string | null;
  waveform_path?: string | null;
}

export interface Clip {
  id: Uuid;
  media_id: Uuid;
  start_ms: number;
  duration_ms: number;
  source_in_ms: number;
  source_out_ms: number;
  volume: number;
  speed: number;
  transform: Transform;
  color: ColorAdjustment;
  text?: TextOverlay | null;
  transition_in_ms: number;
  transition_out_ms: number;
}

export interface Track {
  id: Uuid;
  kind: TrackKind;
  name: string;
  enabled: boolean;
  locked: boolean;
  volume: number;
  clips: Clip[];
}

export interface ProjectSettings {
  name: string;
  width: number;
  height: number;
  fps: number;
  sample_rate: number;
  background_color: string;
}

export interface Project {
  schema_version: number;
  settings: ProjectSettings;
  media: MediaAsset[];
  tracks: Track[];
  created_at: string;
  updated_at: string;
}

export interface ExportSettings {
  output_path: string;
  format: 'mp4_h264' | 'mp4_h265' | 'webm_vp9' | 'mov_prores';
  width: number;
  height: number;
  fps: number;
  video_bitrate_kbps: number;
  audio_bitrate_kbps: number;
  hardware_accel: 'auto' | 'nvenc' | 'qsv' | 'amf' | 'none';
}

export interface ExportProgress {
  stage: 'preparing' | 'encoding' | 'finalizing' | 'done' | 'cancelled' | 'error';
  percent: number;
  message: string;
  current_time_ms?: number;
  total_time_ms?: number;
}

export const DEFAULT_PROJECT: Project = {
  schema_version: 1,
  settings: {
    name: 'Untitled',
    width: 1920,
    height: 1080,
    fps: 30,
    sample_rate: 48000,
    background_color: '#000000',
  },
  media: [],
  tracks: [],
  created_at: '',
  updated_at: '',
};
