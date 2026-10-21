import { VideoRendition } from "../entities/video-rendition.entity";
import { RenditionStatus } from "../types/rendition-status.type";

export interface ProcessingProgress {
  percent: number;
  done: boolean;
  renditions: { name: string; status: RenditionStatus; progress: number }[]
}

const isFinished = (rendition: VideoRendition) =>
  rendition.status === RenditionStatus.READY || rendition.status === RenditionStatus.FAILED;

export const processingProgress = (renditions: VideoRendition[]): ProcessingProgress => {
  const sorted = [...renditions].sort((a, b) => a.height - b.height)
  const total = sorted.reduce((sum, r) => sum + (isFinished(r) ? 100 : r.progress), 0)

  return {
    percent: sorted.length ? Math.round(total / sorted.length) : 0,
    done: sorted.length > 0 && sorted.every(isFinished),
    renditions: sorted.map(r => ({ name: r.name, status: r.status, progress: r.progress })),
  }

}
