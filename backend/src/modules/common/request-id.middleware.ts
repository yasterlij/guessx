import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { StructuredLogger } from "./logger.service";

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  private readonly logger = new StructuredLogger();

  use(req: Request, res: Response, next: NextFunction): void {
    const requestId = (req.headers["x-request-id"] as string) || uuidv4();
    (req as any).requestId = requestId;
    res.setHeader("X-Request-Id", requestId);

    const start = Date.now();

    res.on("finish", () => {
      const duration = Date.now() - start;
      const ip = req.ip || req.socket.remoteAddress || "";
      this.logger.log(
        JSON.stringify({
          method: req.method,
          url: req.originalUrl || req.url,
          statusCode: res.statusCode,
          duration,
          requestId,
          ip,
        }),
      );
    });

    next();
  }
}
