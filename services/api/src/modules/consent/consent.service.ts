import { Inject, Injectable } from '@nestjs/common';
import type { Logger } from 'pino';
import { isConsentItem } from '../../common/enums';
import type { ConsentItem, WithdrawalStatus } from '../../common/enums';
import { ApiError } from '../../common/errors';
import { LOGGER } from '../../common/logger.module';
import type { AuthenticatedUser } from '../auth/auth.types';
import { ConsentRepository } from './consent.repository';
import {
  findConsentState,
  fromConsentRecord,
  projectConsentStates,
  toConsentState,
} from './projection';
import type { ConsentStateView } from './projection';
import {
  CRISIS_MONITORING_ITEM,
  WITHDRAWAL_TTL_MS,
  directConsentChangeViolation,
  withdrawalConfirmationEffects,
} from './rules';
import type { SetConsentDto } from './dto/consent.dto';

export interface WithdrawalView {
  id: string;
  status: WithdrawalStatus;
  expiresAt: Date;
}

@Injectable()
export class ConsentService {
  constructor(
    private readonly records: ConsentRepository,
    @Inject(LOGGER) private readonly logger: Logger,
  ) {}

  async list(user: AuthenticatedUser): Promise<ConsentStateView[]> {
    const records = await this.records.listRecords(user.id);
    return projectConsentStates(records.map(fromConsentRecord), user.createdAt);
  }

  async set(user: AuthenticatedUser, item: string, dto: SetConsentDto): Promise<ConsentStateView> {
    if (!isConsentItem(item)) {
      throw new ApiError('VALIDATION_FAILED', `Unknown consent item "${item}"`);
    }

    const violation = directConsentChangeViolation(item, dto.granted);
    if (violation) {
      throw new ApiError(violation.code, violation.message);
    }

    const before = await this.currentState(user, item);
    if (before.granted === dto.granted) {
      // Append-only history should record decisions, not repeated identical taps.
      return before;
    }

    const record = await this.records.append({
      userId: user.id,
      item,
      granted: dto.granted,
      source: 'settings',
      appVersion: dto.appVersion ?? null,
    });
    return toConsentState(fromConsentRecord(record));
  }

  async history(user: AuthenticatedUser): Promise<ConsentStateView[]> {
    const records = await this.records.listRecords(user.id);
    return records.map((record) => toConsentState(fromConsentRecord(record)));
  }

  /** Step 1 of R-CONSENT-3. Monitoring stays ON until step 2. */
  async startWithdrawal(user: AuthenticatedUser, clientId: string): Promise<WithdrawalView> {
    const now = new Date();
    let withdrawal =
      (await this.records.findWithdrawalByClientId(user.id, clientId)) ??
      (await this.records.createWithdrawal({
        userId: user.id,
        clientId,
        expiresAt: new Date(now.getTime() + WITHDRAWAL_TTL_MS),
      }));

    if (withdrawal.status === 'pending' && withdrawal.expiresAt.getTime() <= now.getTime()) {
      await this.records.markExpired(withdrawal.id, user.id);
      const refreshed = await this.records.findWithdrawal(withdrawal.id, user.id);
      if (refreshed) withdrawal = refreshed;
    }

    return this.toWithdrawalView(withdrawal);
  }

  /** Step 2 of R-CONSENT-3. Without this the monitoring consent stays ON. */
  async confirmWithdrawal(user: AuthenticatedUser, id: string): Promise<ConsentStateView> {
    const withdrawal = await this.records.findWithdrawal(id, user.id);
    if (!withdrawal) {
      throw new ApiError('NOT_FOUND', 'Withdrawal request not found');
    }
    if (withdrawal.status === 'confirmed') {
      return this.currentState(user, CRISIS_MONITORING_ITEM);
    }
    if (withdrawal.status !== 'pending') {
      throw new ApiError('CONFLICT', `Withdrawal request is ${withdrawal.status}`);
    }

    const now = new Date();
    if (withdrawal.expiresAt.getTime() <= now.getTime()) {
      await this.records.markExpired(withdrawal.id, user.id);
      throw new ApiError(
        'CONFLICT',
        'Withdrawal request has expired. Start a new withdrawal request.',
      );
    }

    const effects = withdrawalConfirmationEffects();
    const confirmed = await this.records.confirmWithdrawal({
      id: withdrawal.id,
      userId: user.id,
      now,
      journalPrivacy: effects.journalPrivacy,
    });

    if (!confirmed) {
      // A concurrent confirmation, an expiry, or a cancellation won the race.
      const latest = await this.records.findWithdrawal(id, user.id);
      if (latest?.status === 'confirmed') {
        return this.currentState(user, CRISIS_MONITORING_ITEM);
      }
      if (latest?.status === 'pending' && latest.expiresAt.getTime() <= now.getTime()) {
        throw new ApiError(
          'CONFLICT',
          'Withdrawal request has expired. Start a new withdrawal request.',
        );
      }
      throw new ApiError('CONFLICT', 'Withdrawal request can no longer be confirmed');
    }

    // Audit signal only: no clinical content, no reason. The therapist
    // notification itself is delivered by CP4's notification module (no
    // connections or delivery adapters exist in CP1).
    this.logger.info(
      { event: 'crisis_monitoring_withdrawn', userId: user.id, withdrawalId: confirmed.id },
      'crisis monitoring turned off after two-step confirmation',
    );

    return this.currentState(user, CRISIS_MONITORING_ITEM);
  }

  private async currentState(
    user: AuthenticatedUser,
    item: ConsentItem,
  ): Promise<ConsentStateView> {
    const states = await this.list(user);
    return findConsentState(states, item);
  }

  private toWithdrawalView(withdrawal: {
    id: string;
    status: WithdrawalStatus;
    expiresAt: Date;
  }): WithdrawalView {
    return {
      id: withdrawal.id,
      status: withdrawal.status,
      expiresAt: withdrawal.expiresAt,
    };
  }
}
