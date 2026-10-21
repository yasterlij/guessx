import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Response } from "express";

const ERROR_MAP: Record<number, { code: string; label: string }> = {
  [HttpStatus.BAD_REQUEST]: { code: "ERR_VALIDATION", label: "Bad Request" },
  [HttpStatus.UNAUTHORIZED]: {
    code: "ERR_AUTH_INVALID_CREDENTIALS",
    label: "Authentication Failed",
  },
  [HttpStatus.FORBIDDEN]: {
    code: "ERR_AUTH_FORBIDDEN",
    label: "Access Denied",
  },
  [HttpStatus.NOT_FOUND]: { code: "ERR_NOT_FOUND", label: "Not Found" },
  [HttpStatus.CONFLICT]: { code: "ERR_CONFLICT", label: "Conflict" },
  [HttpStatus.TOO_MANY_REQUESTS]: {
    code: "ERR_RATE_LIMIT",
    label: "Rate Limited",
  },
  [HttpStatus.SERVICE_UNAVAILABLE]: {
    code: "ERR_SERVICE_UNAVAILABLE",
    label: "Service Unavailable",
  },
  [HttpStatus.INTERNAL_SERVER_ERROR]: {
    code: "ERR_SERVER",
    label: "Server Error",
  },
};

const FRIENDLY_MESSAGES: Record<string, string> = {
  "Bid fee not paid": "Bid fee payment is required before placing a bid.",
  "Auction not found or not active":
    "This auction is no longer available. It may have ended.",
  "Auction Closed":
    "This auction has closed. Check the closed auctions page for results.",
  "Auction is not active":
    "This auction is not currently active. Please check back later.",
  "Auction has already ended":
    "This auction has already ended. Bid fees are not accepted for closed auctions.",
  "Auction is not eligible for payment":
    "This auction is not eligible for payment at this time.",
  "Auction is temporarily locked. Please retry.":
    "This auction is busy processing another bid. Please try again.",
  "Too many requests. Please slow down.":
    "You are moving too fast! Please wait a moment before trying again.",
  "Missing nonce or timestamp headers":
    "Request verification failed. Please refresh and try again.",
  "Duplicate request detected (nonce already used)":
    "This request was already submitted. Please wait for confirmation.",
  "Request timestamp too old": "Your request expired. Please try again.",
  "CSRF token missing": "Session verification failed. Please refresh the page.",
  "CSRF token mismatch":
    "Session verification failed. Please refresh the page.",
  "Internal server error": "Something went wrong on our end. Please try again.",
  "SikinaPay service unavailable":
    "Payment service is temporarily unavailable. Please try again.",
  "SikinaPay payment link creation failed":
    "Payment service is temporarily unavailable. Please try again.",
  "Auction not found": "The auction you are looking for could not be found.",
  "Only the winner can initiate payment":
    "Only the auction winner can process this payment.",
};

function getFriendlyMessage(raw: string | string[]): string {
  const msg = Array.isArray(raw) ? raw[0] : raw;
  for (const [key, friendly] of Object.entries(FRIENDLY_MESSAGES)) {
    if (msg.includes(key)) return friendly;
  }
  return msg;
}

function formatValidationErrors(messages: string[]): string {
  const known = messages.filter((m) => FRIENDLY_MESSAGES[m]);
  if (known.length > 0) return known[0];
  return messages.join(". ");
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger("ExceptionFilter");

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    const requestId = request.requestId || "unknown";
    const path = request.url;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let rawMessage: string | string[] = "Internal server error";

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === "string") {
        rawMessage = res;
      } else if (typeof res === "object") {
        rawMessage = (res as any).message || rawMessage;
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        `[${requestId}] ${path} - ${exception.stack || exception.message}`,
      );
    }

    const errorInfo = ERROR_MAP[status] || {
      code: "ERR_SERVER",
      label: "Server Error",
    };

    let message: string;
    if (status === HttpStatus.SERVICE_UNAVAILABLE) {
      message = getFriendlyMessage(rawMessage);
    } else if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      message = FRIENDLY_MESSAGES["Internal server error"];
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
