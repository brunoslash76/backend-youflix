import { z } from "zod"
import { EDSA_CONTEXTS, MODERATION_CATEGORIES } from "../types/moderation-flag.type"

export const moderationVerdictSchema = z.object({
  flags: z.array(
    z.object({
      category: z.enum(MODERATION_CATEGORIES),
      confidence: z.number().min(0).max(1),
      evidence: z.string(),
      timestampsSeconds: z.array(z.number())
    })
  ),
  edsaContext: z.enum(EDSA_CONTEXTS),
  summary: z.string(),
})
