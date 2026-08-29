import type { Project, ExportSettings } from '@shared/types';

export function buildFFmpegArgs(project: Project, settings: ExportSettings): string[] {
  const args: string[] = [];
  args.push('-y');
  const totalMs = project.tracks.flatMap(t => t.clips).reduce((m, c) => Math.max(m, c.start_ms + c.duration_ms), 0);
  args.push('-f', 'lavfi', '-i',
    `color=c=${project.settings.background_color}:size=${settings.width}x${settings.height}:rate=${settings.fps}:duration=${totalMs / 1000}`);
  for (const t of project.tracks) {
    if (!t.enabled) continue;
    for (const c of t.clips) {
      const m = project.media.find(m => m.id === c.media_id);
      if (!m) continue;
      args.push('-i', m.path);
    }
  }
  args.push('-c:v', videoCodec(settings));
  args.push('-b:v', `${settings.video_bitrate_kbps}k`);
  args.push('-c:a', 'aac');
  args.push('-b:a', `${settings.audio_bitrate_kbps}k`);
  args.push('-pix_fmt', 'yuv420p');
  args.push(settings.output_path);
  return args;
}

function videoCodec(s: ExportSettings): string {
  if (s.format === 'mp4_h264') {
    if (s.hardware_accel === 'nvenc') return 'h264_nvenc';
    if (s.hardware_accel === 'qsv') return 'h264_qsv';
    if (s.hardware_accel === 'amf') return 'h264_amf';
    return 'libopenh264';
  }
  if (s.format === 'mp4_h265') return s.hardware_accel === 'nvenc' ? 'hevc_nvenc' : 'libx265';
  if (s.format === 'webm_vp9') return 'libvpx-vp9';
  return 'prores_ks';
}
