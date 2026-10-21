import { Injectable, LoggerService, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.TRANSIENT })
export class StructuredLogger implements LoggerService {
  private context: string = 'Application';

  setContext(context: string): void {
    this.context = context;
  }

  private formatMessage(level: string, message: any, trace?: string): string {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      message: typeof message === 'string' ? message : JSON.stringify(message),
      trace,
      pid: process.pid,
    };
    return JSON.stringify(entry);
  }

  log(message: any, ...optionalParams: any[]) {
    console.log(this.formatMessage('info', message), ...optionalParams);
  }

  error(message: any, trace?: string, ...optionalParams: any[]) {
    console.error(this.formatMessage('error', message, trace), ...optionalParams);
  }

  warn(message: any, ...optionalParams: any[]) {
    console.warn(this.formatMessage('warn', message), ...optionalParams);
  }

  debug(message: any, ...optionalParams: any[]) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.formatMessage('debug', message), ...optionalParams);
    }
  }

  verbose(message: any, ...optionalParams: any[]) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(this.formatMessage('verbose', message), ...optionalParams);
    }
  }
}
