import { Injectable } from "@nestjs/common"
import { config } from "../../config"

export type ChatContentPart =
  | { type: 'text', text: string }
  | { type: 'video_url', video_url: { url: string } }
  | { type: 'input_audio', input_audio: { data: string, format: 'mp3' } }

export interface ChatMessage {
  role: 'system' | 'user'
  content: string | ChatContentPart[]
}

export interface ChatCompletionResult {
  content: string | null
  model: string | null
  finishReason: string | null
  costUsd: number | null
}

interface OpenRouterResponse {
  model?: string
  choices?: {
    finish_reason?: string | null
    message?: {
      content?: string | null
      refusal?: string | null
    }
  }[]
  usage?: {
    cost?: number
  },
  error?: {
    message?: string
  }
}

const REQUEST_TIMEOUT_MS = 180_000

@Injectable()
export class OpenRouterClient {
  async complete(messages: ChatMessage[], responseFormat: object): Promise<ChatCompletionResult> {
    const { apiKey, baseUrl, moderationModels } = config.openrouter

    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY is not set')
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': config.frontendUrl ?? '',
        'X-Title': 'YouFlix moderation'
      },
      body: JSON.stringify({
        models: moderationModels,
        messages,
        response_format: responseFormat,
        temperature: 0,
        max_tokens: 2000,
        provider: {
          require_parameters: true,
          data_collection: 'deny',
        },
        usage: {
          include: true
        },
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    })

    const body = (await response.json().catch(() => ({}))) as OpenRouterResponse
    if (!response.ok) {
      throw new Error(`OpenRouter ${response.status}: ${body.error?.message ?? 'request failed'}`)
    }

    const choice = body.choices?.[0]

    return {
      content: choice?.message?.refusal ? null : (choice?.message?.content ?? null),
      model: body.model ?? null,
      finishReason: choice?.finish_reason ?? null,
      costUsd: body.usage?.cost ?? null,
    }
  }
}

