import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ForbiddenException,
  Optional,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class BiddingWindowInterceptor implements NestInterceptor {
  constructor(@Optional() private prisma?: PrismaService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    if (!this.prisma) {
      return next.handle();
    }
    const auctionId = request.params.id;

    const auction = await this.prisma.repository("auction").findOne({
      where: { id: auctionId, status: "ACTIVE" },
    });

    if (!auction) {
      throw new ForbiddenException("Auction not found or not active");
    }

    const now = Date.now();
    if (now > auction.end_time.getTime()) {
      throw new ForbiddenException("Auction Closed");
    }

    request.auction = auction;
    return next.handle();
  }
}
