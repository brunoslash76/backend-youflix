import { ModerationCategory } from "../types/moderation-flag.type"

export const MODERATION_JOBS = Object.freeze({
  VIDEO: 'moderate-video',
  TEXT: 'moderate-text'
})

export const MODERATION_CHUNK_SECONDS = 120
export const MODERATION_MAX_CHUNKS = 30
export const MODERATION_SAMPLES_FPS = 1
export const MODERATION_SAMPLE_HEIGHT = 360

export const QUARANTINE_CONFIDENCE = 0.3
export const REJECT_CONFIDENCE = 0.7
export const REVIEW_CONFIDENCE = 0.4

export const ALWAYS_BLOCK = Object.freeze(new Set<ModerationCategory>([
  'sexual_explicit',
  'graphic_violence',
  'real_death',
  'animal_cruelty',
  'self_harm_promotion',
  'dangerous_instructions',
  'violent_extremism',
]))

