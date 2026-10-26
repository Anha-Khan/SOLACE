import { Inject, Injectable } from '@nestjs/common';
import { CONFIG } from '../../config/config';
import type { AppConfig } from '../../config/config';

export interface AiClassification {
  tier: 'tier1' | 'tier2' | 'none';
  provider: string;
  durationMs: number;
}

@Injectable()
export class AiService {
  constructor(@Inject(CONFIG) private readonly config: AppConfig) {}

  async classify(text: string): Promise<AiClassification> {
    const start = Date.now();
    const providers: Array<{ name: string; key: string | null; url: string }> = [
      {
        name: 'groq',
        key: this.config.aiGroqApiKey,
        url: 'https://api.groq.com/openai/v1/chat/completions',
      },
      {
        name: 'cerebras',
        key: this.config.aiCerebrasApiKey,
        url: 'https://api.cerebras.ai/v1/chat/completions',
      },
      {
        name: 'openrouter',
        key: this.config.aiOpenRouterApiKey,
        url: 'https://openrouter.ai/api/v1/chat/completions',
      },
    ];

    for (const provider of providers) {
      if (!provider.key) continue;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.config.aiCrisisTimeoutMs);
        const response = await fetch(provider.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${provider.key}`,
          },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [
              {
                role: 'system',
                content:
                  'Classify the user text as tier1, tier2, or none for mental health crisis. Reply with one word.',
              },
              { role: 'user', content: text },
            ],
            max_tokens: 5,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!response.ok) continue;
        const data = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const content = data.choices?.[0]?.message?.content?.trim().toLowerCase() ?? '';
        const tier = content.includes('tier2')
          ? 'tier2'
          : content.includes('tier1')
            ? 'tier1'
            : 'none';
        return { tier, provider: provider.name, durationMs: Date.now() - start };
      } catch {
        continue;
      }
    }

    // Heuristic fallback when no provider is available or all fail.
    const t = text.toLowerCase();
    const tier = /(hopeless|worthless|can't go on|give up)/.test(t)
      ? 'tier2'
      : /(sad|down|anxious|worried)/.test(t)
        ? 'tier1'
        : 'none';
    return { tier, provider: 'heuristic', durationMs: Date.now() - start };
  }

  async scanJournal(
    text: string,
  ): Promise<{
    crisisDetected: boolean;
    sentiment: 'positive' | 'neutral' | 'negative' | 'crisis';
  }> {
    const t = text.toLowerCase();
    if (/(kill|die|suicide)/.test(t)) return { crisisDetected: true, sentiment: 'crisis' };
    if (/(sad|down)/.test(t)) return { crisisDetected: false, sentiment: 'negative' };
    if (/(happy|good|great)/.test(t)) return { crisisDetected: false, sentiment: 'positive' };
    return { crisisDetected: false, sentiment: 'neutral' };
  }

  async selectTask(_userId: string, _stage: string): Promise<string | null> {
    // shortcut: task selection not implemented (eligibility by stage pending), when to upgrade: implement R-STAGE-3/R-CAT-1.
    return 'task_default';
  }
}
