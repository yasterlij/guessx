import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

function getAllowedWsOrigins(): string[] {
  const configuredOrigins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (process.env.NODE_ENV === "production" && configuredOrigins.length === 0) {
    throw new Error(
      "CORS_ORIGINS must be configured in production for WebSocket access",
    );
  }

  if (configuredOrigins.length > 0) {
    return configuredOrigins;
  }

  return ["http://localhost:5173", "http://localhost:3000"];
}

const ALLOWED_WS_ORIGINS = getAllowedWsOrigins();

@WebSocketGateway({
  cors: { origin: ALLOWED_WS_ORIGINS },
  namespace: "/auctions",
})
export class AuctionGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(AuctionGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  @WebSocketServer()
  server: Server;

  async handleConnection(client: Socket): Promise<void> {
    const token =
      (client.handshake.auth as { token?: string })?.token ||
      (client.handshake.headers.authorization || "").replace(/^Bearer\s+/i, "");

    if (!token) {
      this.logger.warn(`Client ${client.id} rejected: no auth token`);
      client.disconnect(true);
      return;
    }

    try {
      await this.jwtService.verifyAsync(token);
    } catch {
      this.logger.warn(`Client ${client.id} rejected: invalid auth token`);
      client.disconnect(true);
      return;
    }

    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage("subscribe:auction")
  handleSubscribeAuction(client: Socket, auctionId: string): void {
    client.join(`auction:${auctionId}`);
    this.logger.debug(`Client ${client.id} subscribed to auction:${auctionId}`);
  }

  @SubscribeMessage("unsubscribe:auction")
  handleUnsubscribeAuction(client: Socket, auctionId: string): void {
    client.leave(`auction:${auctionId}`);
  }

  broadcastAuctionUpdate(payload: {
    auction_id: string;
    total_bids: number;
    timestamp: string;
  }): void {
    this.server
      .to(`auction:${payload.auction_id}`)
      .emit("auction:update", payload);
  }
}
