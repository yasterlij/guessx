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
  [HttpStatus.CONFLICT]: { code: 'ERR_CONFLICT', label: 'Conflict' },
  [HttpStatus.TOO_MANY_REQUESTS]: { code: 'ERR_RATE_LIMIT', label: 'Rate Limited' },
  [HttpStatus.INTERNAL_SERVER_ERROR]: { code: 'ERR_SERVER', label: 'Server Error' },
};

const FRIENDLY_MESSAGES: Record<string, string> = {
  'Phone number and password required': 'Please enter your phone number and password.',
  'Invalid phone number or password': 'The phone number or password you entered is incorrect. Please try again.',
  'Invalid email or password': 'The email or password you entered is incorrect. Please try again.',
  'User not found': 'We could not find your account. Please check your credentials.',
  'User already exists': 'An account with this phone number or email already exists. Try logging in instead.',
  'Bad Request': 'Please check your input and try again.',
  'Forbidden': 'You do not have permission to perform this action.',
  'Not Found': 'The requested resource was not found.',
  'Auction not found or not active': 'This auction is no longer available. It may have ended.',
  'Auction Closed': 'This auction has closed. Check the closed auctions page for results.',
  'Auction is not active': 'This auction is not currently active. Please check back later.',
  'Auction has already ended': 'This auction has already ended. Bid fees are not accepted for closed auctions.',
  'Auction is not eligible for payment': 'This auction is not eligible for payment at this time.',
  'Auction is temporarily locked. Please retry.': 'This auction is busy processing another bid. Please try again.',
  'Bid fee not paid': 'Bid fee payment is required before placing a bid.',
  'Too many requests. Please slow down.': 'You are moving too fast! Please wait a moment before trying again.',
  'Missing nonce or timestamp headers': 'Request verification failed. Please refresh and try again.',
  'Duplicate request detected (nonce already used)': 'This request was already submitted. Please wait for confirmation.',
  'Request timestamp too old': 'Your request expired. Please try again.',
  'CSRF token missing': 'Session verification failed. Please refresh the page.',
  'CSRF token mismatch': 'Session verification failed. Please refresh the page.',
  'Internal server error': 'Something went wrong on our end. Please try again.',
};

function getFriendlyMessage(raw: string | string[]): string {
  const msg = Array.isArray(raw) ? raw[0] : raw;
  return FRIENDLY_MESSAGES[msg] || msg;
}

function formatValidationErrors(messages: string[]): string {
  return messages
    .map((m) => {
      const friendly = FRIENDLY_MESSAGES[m];
      return friendly || m;
    })
    .join('. ');
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    const requestId = request.requestId || 'unknown';
    const path = request.url;

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
      this.logger.error(
        `[${requestId}] ${path} - ${exception.stack || exception.message}`,
      );
    }

    const errorInfo = ERROR_MAP[status] || { code: 'ERR_SERVER', label: 'Server Error' };

    let message: string;
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      message = FRIENDLY_MESSAGES['Internal server error'];
    } else if (Array.isArray(rawMessage) && rawMessage.length > 1) {
      message = formatValidationErrors(rawMessage);
    } else {
      message = getFriendlyMessage(rawMessage);
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
