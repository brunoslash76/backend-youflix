export const SEGMENT_SECONDS = 4;

export const QUEUES = {
  ANALYZE: 'video-analyze',
  TRANSCODE: 'video-transcode',
  FINALIZE: 'video-finalize',
} as const;

export interface Rung {
  name: string;
  height: number;
  videoKbps: number;
  audioKbps: number;
  profile: 'main' | 'high';
  level: string;
  codec: string;
}

export const LADDER: Rung[] = [
  { name: '240p', height: 240, videoKbps: 400, audioKbps: 64, profile: 'main', level: '3.0', codec: 'avc1.4d401e' },
  { name: '360p', height: 360, videoKbps: 800, audioKbps: 96, profile: 'main', level: '3.0', codec: 'avc1.4d401e' },
  { name: '480p', height: 480, videoKbps: 1400, audioKbps: 128, profile: 'main', level: '3.0', codec: 'avc1.4d401e' },
  { name: '720p', height: 720, videoKbps: 2800, audioKbps: 128, profile: 'main', level: '3.1', codec: 'avc1.4d401f' },
  { name: '1080p', height: 1080, videoKbps: 5000, audioKbps: 192, profile: 'high', level: '4.0', codec: 'avc1.640028' },
]

export const ladderFor = (sourceHeight: number): Rung[] => {
  const rungs = LADDER.filter(rung => rung.height <= sourceHeight);
  return rungs.length ? rungs : [LADDER[0]]
}

export const hlsPrefix = (publicId: string) => `videos/${publicId}/hls`;
export const renditionPrefix = (publicId: string, name: string) => `${hlsPrefix(publicId)}/${name}`;
export const masterKey = (publicId: string) => `${hlsPrefix(publicId)}/master.m3u8`; 
