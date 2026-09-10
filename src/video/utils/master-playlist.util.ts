import { LADDER } from "../constants/transcode.constants";
import { VideoRendition } from "../entities/video-rendition.entity";

export function buildMasterPlaylist(renditions: VideoRendition[], hasAudio: boolean) {
  const lines = ['#EXTM3U', '#EXT-X-VERSION:7'];

  for (const rendition of renditions) {
    const rung = LADDER.find((l) => l.name === rendition.name);

    if (!rung) continue;

    const peakKbps = rendition.bitrateKbps + (hasAudio ? rung.audioKbps : 0);
    const bandwidth = Math.round(peakKbps * 1000 * 1.07);
    const codecs = hasAudio ? `${rung.codec},mp4a.40.2` : rung.codec;

    lines.push(
      `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${rendition.width}x${rendition.height},CODECS="${codecs}"`,
      `${rendition.name}/playlist.m3u8`,
    )
  }
  return lines.join('\n') + '\n';
}
