import { Injectable, type NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export interface RequestWithId extends Request {
  id?: string;
}

/**
 * Attaches a request id to every request and echoes it back. An inbound
 * `x-request-id` is trusted only when it is short enough to be safe in a log
 * line; otherwise a fresh UUID is generated. Every error response and every log
 * line carries this id so a user report can be traced end to end.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: RequestWithId, res: Response, next: NextFunction): void {
    const incoming = req.header('x-request-id');
    const id = incoming && incoming.length <= 128 ? incoming : randomUUID();
    req.id = id;
    res.setHeader('x-request-id', id);
    next();
  }
}
