import { ModerationDecision } from "../moderation/util/moderation.policy.util";
import { ModerationFlag } from "./moderation-flag.type";
import { ModerationSource } from "./moderation-status.type";

export interface ModerationEntry {
  source: ModerationSource
  decision: ModerationDecision
  flags?: ModerationFlag[]
  summary?: string | null
  model?: string | null
  costUsd?: number | null
  reviewerId?: string | null
}
