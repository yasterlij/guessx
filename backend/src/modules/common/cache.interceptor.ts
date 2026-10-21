import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { Request, Response } from "express";

type CachePolicy = {
  control: string;
  vary?: string;
};

function normalizeRoutePath(baseUrl: string, routePath?: string): string {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const normalizedRoute = (routePath || "").replace(/^\/+/, "");
  return normalizedRoute
    ? `${normalizedBase}/${normalizedRoute}`
    : normalizedBase;
}

function resolveCachePolicy(request: Request): CachePolicy {
  if (request.method !== "GET") {
    return { control: "no-cache, no-store, must-revalidate" };
  }

  const fullPath = normalizeRoutePath(
    request.baseUrl || "",
    request.route?.path,
  );

  if (fullPath.endsWith("/auctions/active")) {
    return {
      control: "public, max-age=5, stale-while-revalidate=15",
      vary: "Accept-Encoding",
    };
  }

  if (fullPath.endsWith("/auctions/closed")) {
    return {
      control: "private, no-cache, no-store, must-revalidate",
    };
  }

  if (fullPath.endsWith("/products") || /\/products\/:id$/.test(fullPath)) {
    return {
      control: "public, max-age=60, stale-while-revalidate=300",
      vary: "Accept-Encoding",
    };
  }

  return { control: "no-cache, no-store, must-revalidate" };
}

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const policy = resolveCachePolicy(request);

    return next.handle().pipe(
      tap(() => {
        response.setHeader("Cache-Control", policy.control);
        if (policy.vary) {
          response.setHeader("Vary", policy.vary);
          response.removeHeader("Pragma");
          response.removeHeader("Expires");
          return;
        }

        response.setHeader("Pragma", "no-cache");
        response.setHeader("Expires", "0");
      }),
    );
  }
}
