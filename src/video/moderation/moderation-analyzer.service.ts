import { Injectable } from "@nestjs/common";
import { Video } from "../entities/video.entity";
import { ModerationFlag } from "../types/moderation-flag.type";
import { ModerationStatus } from "../types/moderation-status.type";
import { ModerationChunk } from "./moderation-sampler.service";
import { moderationVerdictSchema } from "./moderation-veredict.schema";
import { ChatContentPart, OpenRouterClient } from "./openrouter.client";
import { MODERATION_RESPONSE_FORMAT, MODERATION_SYSTEM_PROMPT } from "./prompts/moderation.prompt";
import { decideModeration, ModerationDecision, mostSevere } from "./util/moderation.policy.util";

export interface ModerationResult {
  decision: ModerationDecision
  flags: ModerationFlag[]
  summary: string
  model: string | null
  costUsd: number | null
}

const parseJson = (raw: string): unknown => {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export const combineResults = (results: ModerationResult[]): ModerationResult => ({
  decision: mostSevere(results.map(result => result.decision)),
  flags: results.flatMap(result => result.flags),
  summary: results.map(result => result.summary).filter(Boolean).join(' '),
  model: results.find(result => result.model)?.model ?? null,
  costUsd: results.reduce((sum, result) => sum + (result.costUsd ?? 0), 0),
})

@Injectable()
export class ModerationAnalyzerService {
  constructor(private readonly openRouter: OpenRouterClient) { }

  async analyzeChunk(video: Video, chunk: ModerationChunk, chunkSeconds: number): Promise<ModerationResult> {
    const end = Math.min(chunk.startSeconds + chunkSeconds, Math.round(video.durationSeconds ?? 0))
    const parts: ChatContentPart[] = [
      { type: 'text', text: this.describe(video, `Clip from ${chunk.startSeconds}s to ${end}s of the video.`) },
      { type: 'video_url', video_url: { url: `data:video/mp4;base64,${chunk.video.toString('base64')}` } },
    ]


    if (chunk.audio) {
      parts.push({ type: 'input_audio', input_audio: { data: chunk.audio.toString('base64'), format: 'mp3' } })
    }

    const result = await this.run(parts)
    return {
      ...result,
      flags: result.flags.map(flag => ({
        ...flag,
        timestampsSeconds: flag.timestampsSeconds.map(seconds => Math.round(seconds + chunk.startSeconds)),
      })),
    }
  }

  analyzeText(video: Video): Promise<ModerationResult> {
    return this.run([{ type: 'text', text: this.describe(video, 'No media is attached. Classify only the title and description.') }])
  }

  private describe(video: Video, context: string) {
    return [
      context,
      `Title (untrusted): ${JSON.stringify(video.title ?? '')}`,
      `Description (untrusted): ${JSON.stringify(video.description ?? '')}`,
    ].join('\n')
  }

  private async run(parts: ChatContentPart[]): Promise<ModerationResult> {
    const completion = await this.openRouter.complete(
      [
        { role: 'system', content: MODERATION_SYSTEM_PROMPT },
        { role: 'user', content: parts },
      ],
      MODERATION_RESPONSE_FORMAT,
    )
    const base = { model: completion.model, costUsd: completion.costUsd, flags: [], summary: '' }
    if (!completion.content) {
      return { ...base, decision: { status: ModerationStatus.NEEDS_REVIEW, reason: `model_refused:${completion.finishReason ?? 'empty'}` } }
    }
    const parsed = moderationVerdictSchema.safeParse(parseJson(completion.content))
    if (!parsed.success) {
      return { ...base, decision: { status: ModerationStatus.NEEDS_REVIEW, reason: 'invalid_model_response' } }
    }
    const { flags, edsaContext, summary } = parsed.data
    return {
      ...base,
      flags,
      summary,
      decision: decideModeration(flags, edsaContext),
    }
  }
}
