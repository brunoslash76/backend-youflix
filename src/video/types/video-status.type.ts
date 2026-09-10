export enum VideoStatus {
  AWAITING_UPLOAD = 'awaiting_upload',  // row created, S3 upload not finished
  UPLOADED = 'uploaded',          // bytes confirmed in S3, queued
  ANALYZING = 'analyzing',         // probing
  TRANSCODING = 'transcoding',       // ladder in flight
  READY = 'ready',             // master playlist written, playable
  FAILED = 'failed',
}
