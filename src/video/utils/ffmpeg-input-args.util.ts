const DEMUXER_BY_MIME = {
  'video/mp4': 'mov',
  'video/quicktime': 'mov',
  'video/webm': 'matroska',
} as const

export type SupportedMimeType = keyof typeof DEMUXER_BY_MIME

export const isSupportedMimeType = (value: string): value is SupportedMimeType =>
  value in DEMUXER_BY_MIME


export const REMOTE_INPUT_PROTOCOLS = 'http,https,tcp,tls'

export const LOCAL_INPUT_PROTOCOLS = 'file'


export const ffmpegInputArgs = (contentType: SupportedMimeType, protocols: string): string[] =>
  ['-f', DEMUXER_BY_MIME[contentType], '-protocol_whitelist', protocols]