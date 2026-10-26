import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { map, type Observable } from 'rxjs';
import { successEnvelope, type ApiEnvelope } from '../envelope';

/**
 * Wraps every successful controller return value in the standard envelope.
 * Controllers therefore return plain data and never build the envelope by hand.
 */
@Injectable()
export class EnvelopeInterceptor<T> implements NestInterceptor<T, ApiEnvelope<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<ApiEnvelope<T>> {
    return next.handle().pipe(map((data) => successEnvelope(data)));
  }
}
