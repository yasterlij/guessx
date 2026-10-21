import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";

@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly csrfSecret: string;

  constructor(private configService: ConfigService) {
    const secret = this.configService.get<string>("app.internalApiKey");
    if (!secret) {
      throw new Error("CSRF secret is not configured (set INTERNAL_API_KEY)");
    }
    this.csrfSecret = secret;
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    if (["GET", "HEAD", "OPTIONS"].includes(request.method)) {
      return true;
    }

    const token = request.headers["x-csrf-token"];
    const cookieToken = request.cookies?.["csrf-token"];

    if (!token || !cookieToken) {
      throw new ForbiddenException("CSRF token missing");
    }

    const expected = crypto
      .createHmac("sha256", this.csrfSecret)
      .update(cookieToken)
      .digest("hex");

    if (token !== expected) {
      throw new ForbiddenException("CSRF token mismatch");
    }

    return true;
  }
}
