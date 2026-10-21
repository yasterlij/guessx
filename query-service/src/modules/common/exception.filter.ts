import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

const ERROR_MAP: Record<number, { code: string; label: string }> = {
  [HttpStatus.BAD_REQUEST]: { code: 'ERR_VALIDATION', label: 'Bad Request' },
  [HttpStatus.UNAUTHORIZED]: { code: 'ERR_AUTH_INVALID_CREDENTIALS', label: 'Authentication Failed' },
  [HttpStatus.FORBIDDEN]: { code: 'ERR_AUTH_FORBIDDEN', label: 'Access Denied' },
  [HttpStatus.NOT_FOUND]: { code: 'ERR_NOT_FOUND', label: 'Not Found' },
  [HttpStatus.TOO_MANY_REQUESTS]: { code: 'ERR_RATE_LIMIT', label: 'Rate Limited' },
  [HttpStatus.INTERNAL_SERVER_ERROR]: { code: 'ERR_SERVER', label: 'Server Error' },
};

const FRIENDLY_MESSAGES: Record<string, string> = {
  'Auction not found': 'The auction you are looking for could not be found.',
  'Auction not found or has ended': 'This auction has ended or does not exist.',
  'Internal server error': 'Something went wrong on our end. Please try again.',
};

function getFriendlyMessage(raw: string | string[]): string {
  const msg = Array.isArray(raw) ? raw[0] : raw;
  for (const [key, friendly] of Object.entries(FRIENDLY_MESSAGES)) {
    if (msg.includes(key)) return friendly;
  }
  return msg;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    const requestId = request.requestId || 'unknown';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let rawMessage: string | string[] = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        rawMessage = res;
      } else if (typeof res === 'object') {
        rawMessage = (res as any).message || rawMessage;
      }
    } else if (exception instanceof Error) {
      this.logger.error(`[${requestId}] ${request.url} - ${exception.stack || exception.message}`);
    }

    const errorInfo = ERROR_MAP[status] || { code: 'ERR_SERVER', label: 'Server Error' };

    let message: string;
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      message = FRIENDLY_MESSAGES['Internal server error'];
    } else {
      message = Array.isArray(rawMessage) ? rawMessage[0] : getFriendlyMessage(rawMessage);
    }

    response.status(status).json({
      statusCode: status,
      errorCode: errorInfo.code,
      message,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }
}
