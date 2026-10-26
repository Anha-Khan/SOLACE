import { Injectable } from '@nestjs/common';
import { ApiError } from '../../common/errors';
import { CrisisRepository } from '../crisis/crisis.repository';
import type { AuthenticatedUser } from '../auth/auth.types';
import { InviteService } from './invite.service';
import { SessionRepository } from '../auth/session.repository';

@Injectable()
export class TherapistAlertService {
  constructor(
    private readonly crisisRepo: CrisisRepository,
    private readonly invites: InviteService,
    private readonly sessions: SessionRepository,
  ) {}

  private async requireFreshSession(user: AuthenticatedUser): Promise<void> {
    const found = await this.sessions.findActiveWithUser(user.sessionId);
    const started = found?.session?.createdAt ?? user.createdAt;
    const ageMs = Date.now() - started.getTime();
    if (ageMs > 4 * 60 * 60 * 1000) {
      throw new ApiError('REAUTH_REQUIRED', 'Re-authentication required');
    }
  }

  async listAlerts(user: AuthenticatedUser) {
    await this.requireFreshSession(user);
    const patients = await this.invites.listPatients(user);
    const patientIds = patients.map((p) => p.patientId);
    return this.crisisRepo.listOpenAlertsForUsers(patientIds);
  }

  async getAlert(user: AuthenticatedUser, alertId: string) {
    await this.requireFreshSession(user);
    const alert = await this.crisisRepo.findAlert(alertId);
    if (!alert) throw new ApiError('NOT_FOUND', 'Alert not found');
    const ok = await this.invites.hasActiveConnection(user.id, alert.userId);
    if (!ok) throw new ApiError('NOT_FOUND', 'Alert not found');
    return alert;
  }

  async review(user: AuthenticatedUser, alertId: string) {
    await this.requireFreshSession(user);
    const alert = await this.getAlert(user, alertId);
    await this.crisisRepo.transitionAlert(alertId, 'acknowledge', 'therapist', 'reviewed');
    const updated = await this.crisisRepo.findAlert(alertId);
    return { ...(updated ?? alert), undoDeadline: new Date(Date.now() + 60_000) };
  }

  async undoReview(user: AuthenticatedUser, alertId: string) {
    await this.requireFreshSession(user);
    const alert = await this.getAlert(user, alertId);
    if (alert.undoDeadline && new Date() > alert.undoDeadline) {
      throw new ApiError('UNDO_WINDOW_CLOSED', 'Undo window closed');
    }
    return this.crisisRepo.transitionAlert(alertId, 'undo_acknowledge', 'therapist', 'undo');
  }

  async resolve(user: AuthenticatedUser, alertId: string, checklist: Record<string, boolean>) {
    await this.requireFreshSession(user);
    await this.getAlert(user, alertId);
    const allChecked =
      Object.values(checklist).every(Boolean) && Object.keys(checklist).length >= 3;
    if (!allChecked) throw new ApiError('VALIDATION_FAILED', 'All checklist items required');
    return this.crisisRepo.resolveAlert(alertId, checklist);
  }
}
