import { Injectable } from '@nestjs/common';

@Injectable()
export class MetricsService {
  private httpRequestsTotal = 0;
  private httpErrorsTotal = 0;
  private activeConnections = 0;
  private dbQueriesTotal = 0;
  private requestDurations: number[] = [];

  incrementHttpRequests(): void {
    this.httpRequestsTotal++;
  }

  incrementHttpErrors(): void {
    this.httpErrorsTotal++;
  }

  incrementActiveConnections(): void {
    this.activeConnections++;
  }

  decrementActiveConnections(): void {
    this.activeConnections = Math.max(0, this.activeConnections - 1);
  }

  incrementDbQueries(): void {
    this.dbQueriesTotal++;
  }

  recordRequestDuration(seconds: number): void {
    this.requestDurations.push(seconds);
    if (this.requestDurations.length > 1000) {
      this.requestDurations.shift();
    }
  }

  getMetrics(): string {
    const sum = this.requestDurations.reduce((a, b) => a + b, 0);
    const count = this.requestDurations.length;
    const avg = count > 0 ? sum / count : 0;

    const lines: string[] = [];

    lines.push('# HELP http_requests_total Total number of HTTP requests');
    lines.push('# TYPE http_requests_total counter');
    lines.push(`http_requests_total ${this.httpRequestsTotal}`);

    lines.push('# HELP http_request_duration_seconds Request duration in seconds');
    lines.push('# TYPE http_request_duration_seconds histogram');
    lines.push(`http_request_duration_seconds_sum ${sum.toFixed(6)}`);
    lines.push(`http_request_duration_seconds_count ${count}`);
    lines.push(`http_request_duration_seconds_avg ${avg.toFixed(6)}`);

    lines.push('# HELP http_errors_total Total number of HTTP errors');
    lines.push('# TYPE http_errors_total counter');
    lines.push(`http_errors_total ${this.httpErrorsTotal}`);

    lines.push('# HELP active_connections Current active connections');
    lines.push('# TYPE active_connections gauge');
    lines.push(`active_connections ${this.activeConnections}`);

    lines.push('# HELP db_queries_total Total number of database queries');
    lines.push('# TYPE db_queries_total counter');
    lines.push(`db_queries_total ${this.dbQueriesTotal}`);

    return lines.join('\n');
  }
}
