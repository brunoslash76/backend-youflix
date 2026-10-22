import { ALWAYS_BLOCK, QUARANTINE_CONFIDENCE, REJECT_CONFIDENCE, REVIEW_CONFIDENCE } from "../../constants/moderation.constant";
import { EdsaContext, ModerationFlag } from "../../types/moderation-flag.type";
import { ModerationStatus } from "../../types/moderation-status.type";

export interface ModerationDecision {
  status: ModerationStatus
  reason: string | null
}

const SEVERITY: Record<ModerationStatus, number> = Object.freeze({
  [ModerationStatus.PENDING]: 0,
  [ModerationStatus.APPROVED]: 1,
  [ModerationStatus.NEEDS_REVIEW]: 2,
  [ModerationStatus.REJECTED]: 3,
  [ModerationStatus.QUARANTINED]: 4,
})

const APPROVED: ModerationDecision = {
  status: ModerationStatus.APPROVED,
  reason: null,
}

const categoriesOf = (flags: ModerationFlag[]) => [
  ...new Set(flags.map(flag => flag.category))
].join(', ')


export const isBlockedStatus = (status: ModerationStatus) =>
  status === ModerationStatus.REJECTED || status === ModerationStatus.QUARANTINED

export const decideModeration = (flags: ModerationFlag[], edsaContext: EdsaContext): ModerationDecision => {
  if (flags.some(flag => flag.category === 'sexual_minors' && flag.confidence >= QUARANTINE_CONFIDENCE)) {
    return {
      status: ModerationStatus.QUARANTINED,
      reason: 'sexual_minors',
    }
  }

  const blocking = flags.filter(flag => ALWAYS_BLOCK.has(flag.category) && flag.confidence >= REJECT_CONFIDENCE)
  if (blocking.length && edsaContext === 'none') {
    return {
      status: ModerationStatus.REJECTED,
      reason: categoriesOf(blocking)
    }
  }

  const suspicious = flags.filter(flag => flag.confidence >= REVIEW_CONFIDENCE)
  if (suspicious.length) {
    return {
      status: ModerationStatus.NEEDS_REVIEW,
      reason: categoriesOf(suspicious)
    }
  }

  return APPROVED
}

export const mostSevere = (decisions: ModerationDecision[]): ModerationDecision => {
  return decisions.reduce(
    (worst, decision) => (
      SEVERITY[decision.status] > SEVERITY[worst.status]
        ? decision
        : worst
    ),
    APPROVED
  )
}

export const mergeModeration = (
  current: ModerationStatus,
  currentReason: string | null,
  next: ModerationDecision
): ModerationDecision => {
  return (
    current === ModerationStatus.PENDING
      ? next
      : mostSevere([{ status: current, reason: currentReason }, next])
  )
}
