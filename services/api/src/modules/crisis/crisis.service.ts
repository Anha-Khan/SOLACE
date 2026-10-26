import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { LOGGER } from '../../common/logger.module';
import type { Logger } from 'pino';
import { ApiError } from '../../common/errors';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CrisisRepository } from './crisis.repository';
import { detectTier3, classifyTier, RULE_VERSION } from './detector';
import { EscalationQueue } from './escalation.queue';
import { CrisisTier, CrisisTrigger } from '../../common/enums';

export interface CrisisCheckResult {
  tier: CrisisTier | 'possible_concern' | 'none';
  crisisEventId: string | null;
  alertId: string | null;
  ruleVersion: string;
  historical: boolean;
}

const FRESHNESS_MS = 2 * 60 * 60 * 1000;

@Injectable()
export class CrisisService implements OnModuleInit {
  constructor(
    private readonly repo: CrisisRepository,
    private readonly queue: EscalationQueue,
    @Inject(LOGGER) private readonly logger: Logger,
  ) {}

  async onModuleInit(): Promise<void> {
    // Reconcile: re-schedule missing escalation jobs for open alerts.
    try {
      const open = await this.repo.listOpenAlerts();
      for (const alert of open) {
        await this.queue.schedule(alert.id, alert.userId, false).catch((err) => {
          this.logger.warn(
            { err: (err as Error).message, alertId: alert.id },
            'reconcile schedule failed',
          );
        });
      }
    } catch (error) {
      this.logger.warn({ err: (error as Error).message }, 'escalation reconcile failed');
    }
  }

  async check(
    user: AuthenticatedUser,
    text: string,
    clientCreatedAt?: Date,
  ): Promise<CrisisCheckResult> {
    const detection = detectTier3(text);
    const explicitTier3 = detection.tier === 'tier3';
    // Heuristic Tier 1/2 signal when no AI provider is configured. Real providers
    // (Groq/Cerebras/OpenRouter) are wired in CP4; until then this keyword pass
    // keeps the endpoint functional and deterministic.
    const aiSignal = heuristicSignal(text);
    const tier = classifyTier({ explicitTier3, aiSignal });

    const now = new Date();
    const created = clientCreatedAt ?? now;
    const historical = now.getTime() - created.getTime() > FRESHNESS_MS;

    const triggerType: CrisisTrigger = explicitTier3
      ? CrisisTrigger.tier3_explicit_language
      : aiSignal === 'tier2'
        ? CrisisTrigger.tier2_ai_signal
        : aiSignal === 'tier1'
          ? CrisisTrigger.tier1_ai_signal
          : CrisisTrigger.possible_concern;

    const event = await this.repo.createEvent({
      userId: user.id,
      tier: tier as CrisisTier,
      triggerType,
      ruleVersion: RULE_VERSION,
      sourceRef: null,
      clientCreatedAt: created,
      historical,
    });

    let alertId: string | null = null;
    if (tier === 'tier2' || tier === 'tier3') {
      const alert = await this.repo.createAlert(user.id, event.id);
      alertId = alert.id;
      await this.repo
        .transitionAlert(alert.id, 'dispatch', 'system', triggerType)
        .catch((err) =>
          this.logger.warn(
            { err: (err as Error).message, alertId: alert.id },
            'dispatch transition failed',
          ),
        );
      await this.repo
        .transitionAlert(alert.id, 'deliver', 'system', triggerType)
        .catch((err) =>
          this.logger.warn(
            { err: (err as Error).message, alertId: alert.id },
            'deliver transition failed',
          ),
        );
      await this.queue.schedule(alert.id, user.id, historical);
      if (historical && explicitTier3) {
        this.logger.info({ alertId: alert.id }, 'historical tier3: notified once, no timer');
      }
    }

    return {
      tier: tier as CrisisCheckResult['tier'],
      crisisEventId: event.id,
      alertId,
      ruleVersion: RULE_VERSION,
      historical,
    };
  }

  async selfInitiated(user: AuthenticatedUser, clientCreatedAt?: Date): Promise<CrisisCheckResult> {
    const now = new Date();
    const created = clientCreatedAt ?? now;
    const historical = now.getTime() - created.getTime() > FRESHNESS_MS;
    const event = await this.repo.createEvent({
      userId: user.id,
      tier: CrisisTier.tier2,
      triggerType: CrisisTrigger.self_initiated,
      ruleVersion: RULE_VERSION,
      sourceRef: null,
      clientCreatedAt: created,
      historical,
    });
    const alert = await this.repo.createAlert(user.id, event.id);
    await this.repo
      .transitionAlert(alert.id, 'dispatch', 'system', 'self_initiated')
      .catch((err) =>
        this.logger.warn(
          { err: (err as Error).message, alertId: alert.id },
          'dispatch transition failed',
        ),
      );
    await this.repo
      .transitionAlert(alert.id, 'deliver', 'system', 'self_initiated')
      .catch((err) =>
        this.logger.warn(
          { err: (err as Error).message, alertId: alert.id },
          'deliver transition failed',
        ),
      );
    await this.queue.schedule(alert.id, user.id, historical);
    return {
      tier: CrisisTier.tier2,
      crisisEventId: event.id,
      alertId: alert.id,
      ruleVersion: RULE_VERSION,
      historical,
    };
  }

  async patientConsent(
    user: AuthenticatedUser,
    alertId: string,
    consent: boolean,
  ): Promise<{ alertId: string; consent: boolean; state: string }> {
    const alert = await this.repo.findAlert(alertId);
    if (!alert || alert.userId !== user.id) throw new ApiError('NOT_FOUND', 'Alert not found');
    const checklist = (alert.checklist as Record<string, boolean>) ?? {};
    checklist.patientConsent = consent;
    if (consent) {
      await this.repo
        .transitionAlert(alertId, 'contact_patient', 'patient', 'patient_consent')
        .catch((err) =>
          this.logger.warn(
            { err: (err as Error).message, alertId },
            'contact_patient transition failed',
          ),
        );
    }
    await this.repo.resolveAlert(alertId, checklist).catch(() => undefined);
    const updated = await this.repo.findAlert(alertId);
    return { alertId, consent, state: updated?.state ?? alert.state };
  }

  resources(): Array<{ title: string; body: string; url: string }> {
    return [
      {
        title: 'Crisis support',
        body: 'If you are in immediate danger, call emergency services.',
        url: 'tel:112',
      },
      {
        title: 'Talk to someone',
        body: 'Reach a trained listener any time.',
        url: 'https://example.invalid/crisis',
      },
    ];
  }

  async syncItems(
    user: AuthenticatedUser,
    items: Array<{
      clientId: string;
      type: string;
      clientCreatedAt: string;
      payload?: Record<string, unknown>;
    }>,
  ): Promise<
    Array<{
      clientId: string;
      status: 'accepted' | 'duplicate' | 'historical_flagged' | 'rejected';
    }>
  > {
    const seen = new Set<string>();
    const out: Array<{
      clientId: string;
      status: 'accepted' | 'duplicate' | 'historical_flagged' | 'rejected';
    }> = [];
    for (const item of items) {
      if (seen.has(item.clientId)) {
        out.push({ clientId: item.clientId, status: 'duplicate' });
        continue;
      }
      seen.add(item.clientId);
      const created = new Date(item.clientCreatedAt);
      const historical = Date.now() - created.getTime() > FRESHNESS_MS;
      if (item.type === 'crisis_check') {
        const text = typeof item.payload?.text === 'string' ? item.payload.text : '';
        const result = await this.check(user, text, created);
        out.push({
          clientId: item.clientId,
          status: result.historical ? 'historical_flagged' : 'accepted',
        });
        continue;
      }
      out.push({ clientId: item.clientId, status: historical ? 'historical_flagged' : 'accepted' });
    }
    return out;
  }
}

function heuristicSignal(text: string): 'tier1' | 'tier2' | 'none' {
  const t = text.toLowerCase();
  if (/(hopeless|worthless|can't go on|give up)/.test(t)) return 'tier2';
  if (/(sad|down|anxious|worried)/.test(t)) return 'tier1';
  return 'none';
}
