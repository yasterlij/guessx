import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const start = Date.now();
    const httpContext = context.switchToHttp();
    const response = httpContext.getResponse();

    this.metricsService.incrementHttpRequests();
    this.metricsService.incrementActiveConnections();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = (Date.now() - start) / 1000;
          this.metricsService.recordRequestDuration(duration);
          this.metricsService.decrementActiveConnections();
        },
        error: () => {
          const duration = (Date.now() - start) / 1000;
          this.metricsService.recordRequestDuration(duration);
          this.metricsService.incrementHttpErrors();
          this.metricsService.decrementActiveConnections();
        },
        finalize: () => {
          if (response && response.finished) {
            return;
          }
        },
      }),
    );
  }
}
