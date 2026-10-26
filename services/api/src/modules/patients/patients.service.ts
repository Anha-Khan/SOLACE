import { Injectable } from '@nestjs/common';
import { InviteService } from '../therapist/invite.service';

@Injectable()
export class PatientsService {
  constructor(private readonly invites: InviteService) {}

  async list(therapistId: string) {
    return this.invites.listPatients({ id: therapistId } as never);
  }
}
