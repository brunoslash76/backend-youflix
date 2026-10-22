export const MODERATION_CATEGORIES = [
  'sexual_minors',
  'sexual_explicit',
  'graphic_violence',
  'real_death',
  'animal_cruelty',
  'self_harm_promotion',
  'dangerous_instructions',
  'violent_extremism',
  'hate_speech',
  'harassment',
  'regulated_goods',
  'harmful_misinformation',
  'scam_spam',
] as const

export type ModerationCategory = (typeof MODERATION_CATEGORIES)[number]

export const EDSA_CONTEXTS = ['none', 'educational', 'documentary', 'scientific', 'artistic', 'news'] as const

export type EdsaContext = (typeof EDSA_CONTEXTS)[number]

export interface ModerationFlag {
  category: ModerationCategory
  confidence: number
  evidence: string
  timestampsSeconds: number[]
}
