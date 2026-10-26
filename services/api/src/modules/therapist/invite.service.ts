import { randomBytes, createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { ApiError } from '../../common/errors';
import { connectionTransition, InvalidConnectionTransition } from './connections/state';
import { ConnectionState } from '../../common/enums';
import type { AuthenticatedUser } from '../auth/auth.types';

@Injectable()
export class InviteService {
  constructor(private readonly prisma: PrismaService) {}

  private transitionOrThrow(
    current: ConnectionState,
    event: Parameters<typeof connectionTransition>[1],
  ): ConnectionState {
    try {
      return connectionTransition(current, event);
    } catch (error) {
      if (error instanceof InvalidConnectionTransition) {
        throw new ApiError('CONFLICT', error.message);
      }
      throw error;
    }
  }

  async createInvite(patient: AuthenticatedUser, therapistEmail: string, patientFirstName: string) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(therapistEmail)) {
      throw new ApiError('VALIDATION_FAILED', 'therapistEmail must be an email');
    }
    const active = await this.prisma.connection.findFirst({
      where: { patientId: patient.id, state: 'active' },
    });
    if (active) {
      throw new ApiError('CONFLICT', 'An active therapist connection already exists');
    }
    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const invite = await this.prisma.invite.create({
      data: {
        patientId: patient.id,
        therapistEmail,
        tokenHash,
        patientFirstName,
        expiresAt,
        status: 'pending',
      },
    });
    return { id: invite.id, token, expiresAt };
  }

  async acceptInvite(token: string, therapist: AuthenticatedUser) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const invite = await this.prisma.invite.findUnique({ where: { tokenHash } });
    if (!invite || invite.status !== 'pending' || invite.expiresAt < new Date()) {
      throw new ApiError('CONFLICT', 'Invite is invalid or expired');
    }
    if (invite.therapistEmail !== (await this.emailOf(therapist.id))) {
      throw new ApiError('FORBIDDEN', 'Invite is for a different therapist');
    }
    await this.prisma.invite.update({
      where: { id: invite.id },
      data: { status: 'accepted', therapistUserId: therapist.id },
    });
    const connection = await this.prisma.connection.create({
      data: {
        patientId: invite.patientId,
        therapistId: therapist.id,
        state: ConnectionState.pending_therapist,
      },
    });
    const next = this.transitionOrThrow(ConnectionState.pending_therapist, 'therapist_accepts');
    await this.prisma.connection.update({ where: { id: connection.id }, data: { state: next } });
    return { connectionId: connection.id, state: next, patientId: invite.patientId };
  }

  private async emailOf(userId: string): Promise<string | null> {
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    return u?.email ?? null;
  }

  async pendingConnections(patient: AuthenticatedUser) {
    return this.prisma.connection.findMany({
      where: {
        patientId: patient.id,
        state: {
          in: [ConnectionState.pending_therapist, ConnectionState.awaiting_patient_confirmation],
        },
      },
    });
  }

  async patientConfirm(patient: AuthenticatedUser, connectionId: string) {
    const conn = await this.prisma.connection.findFirst({
      where: { id: connectionId, patientId: patient.id },
    });
    if (!conn) throw new ApiError('NOT_FOUND', 'Connection not found');
    const next = this.transitionOrThrow(conn.state as ConnectionState, 'patient_confirms');
    await this.prisma.connection.update({
      where: { id: connectionId },
      data: { state: next, confirmedAt: new Date() },
    });
    return { connectionId, state: next };
  }

  async patientDecline(patient: AuthenticatedUser, connectionId: string) {
    const conn = await this.prisma.connection.findFirst({
      where: { id: connectionId, patientId: patient.id },
    });
    if (!conn) throw new ApiError('NOT_FOUND', 'Connection not found');
    const next = this.transitionOrThrow(conn.state as ConnectionState, 'patient_declines');
    await this.prisma.connection.update({
      where: { id: connectionId },
      data: { state: next, endedAt: new Date() },
    });
    return { connectionId, state: next };
  }

  async patientFlagWrong(patient: AuthenticatedUser, connectionId: string) {
    const conn = await this.prisma.connection.findFirst({
      where: { id: connectionId, patientId: patient.id },
    });
    if (!conn) throw new ApiError('NOT_FOUND', 'Connection not found');
    const next = this.transitionOrThrow(conn.state as ConnectionState, 'patient_flags_wrong');
    await this.prisma.connection.update({
      where: { id: connectionId },
      data: { state: next, wrongConnectionFlag: true },
    });
    return { connectionId, state: next };
  }

  async patientEnd(patient: AuthenticatedUser, connectionId: string) {
    const conn = await this.prisma.connection.findFirst({
      where: { id: connectionId, patientId: patient.id },
    });
    if (!conn) throw new ApiError('NOT_FOUND', 'Connection not found');
    const next = this.transitionOrThrow(conn.state as ConnectionState, 'patient_ends');
    await this.prisma.connection.update({
      where: { id: connectionId },
      data: { state: next, endedAt: new Date() },
    });
    return { connectionId, state: next };
  }

  async listPatients(therapist: AuthenticatedUser) {
    const conns = await this.prisma.connection.findMany({
      where: { therapistId: therapist.id, state: ConnectionState.active },
    });
    return conns.map((c) => ({ patientId: c.patientId, connectionId: c.id, state: c.state }));
  }

  async hasActiveConnection(therapistId: string, patientId: string): Promise<boolean> {
    const c = await this.prisma.connection.findFirst({
      where: { therapistId, patientId, state: ConnectionState.active },
    });
    return !!c;
  }
}
