import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Param,
  Query,
  HttpCode,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";
import { InternalAuthGuard } from "../common/internal-auth.guard";
import { AuthOrInternalGuard } from "../common/auth-or-internal.guard";
import { WalletService } from "./wallet.service";
import { WalletPinService } from "./wallet-pin.service";
import { WebhookSignatureGuard } from "./webhook.guard";
import { DepositDto } from "./dto/deposit.dto";
import { DeductFeeDto } from "./dto/deduct-fee.dto";
import { FintechWebhookDto } from "./dto/fintech-webhook.dto";
import { SetPinDto } from "./dto/set-pin.dto";
import { VerifyPinDto } from "./dto/verify-pin.dto";
import { JwtAuthGuard } from "../common/jwt-auth.guard";

@Controller("wallet")
export class WalletController {
  constructor(
    private walletService: WalletService,
    private walletPinService: WalletPinService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get("balance")
  async getBalance(@Req() req: { user: { id: string; role?: string } }) {
    const balance = await this.walletService.getBalance(req.user.id);
    return { balance };
  }

  @UseGuards(JwtAuthGuard)
  @Get("transactions")
  async getTransactions(
    @Req() req: { user: { id: string; role?: string } },
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.walletService.getTransactions(
      req.user.id,
      Math.max(1, parseInt(page || "1", 10)),
      Math.min(100, Math.max(1, parseInt(limit || "20", 10))),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post("deposit")
  @HttpCode(200)
  async deposit(@Req() req: { user: { id: string; role?: string } }, @Body() dto: DepositDto) {
    if (process.env.NODE_ENV === "production" && req.user?.role !== "admin") {
      throw new ForbiddenException(
        "Direct deposits are disabled in production. Use an approved payment gateway.",
      );
    }
    const ref =
      dto.reference_id?.trim() ||
      `deposit_${req.user.id}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const user = await this.walletService.deposit(
      req.user.id,
      dto.amount,
      ref,
    );
    return { balance: Number(user.wallet_balance) };
  }

  @UseGuards(WebhookSignatureGuard)
  @Post("webhook/fintech")
  async handleFintechWebhook(@Body() payload: FintechWebhookDto) {
    await this.walletService.handleFintechWebhook(payload);
    return { received: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post("set-pin")
  @HttpCode(200)
  async setPin(@Req() req: { user: { id: string; role?: string } }, @Body() dto: SetPinDto) {
    await this.walletPinService.setPin(req.user.id, dto.pin);
    return { set: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post("verify-pin")
  @HttpCode(200)
  async verifyPin(@Req() req: { user: { id: string; role?: string } }, @Body() dto: VerifyPinDto) {
    const result = await this.walletPinService.verifyPin(req.user.id, dto.pin);
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Get("has-pin")
  async hasPin(@Req() req: { user: { id: string; role?: string } }) {
    const hasPin = await this.walletPinService.hasPin(req.user.id);
    return { hasPin };
  }

  @UseGuards(JwtAuthGuard)
  @Get("pin-status")
  async getPinStatus(@Req() req: { user: { id: string; role?: string } }) {
    return this.walletPinService.getPinStatus(req.user.id);
  }

  @UseGuards(AuthOrInternalGuard)
  @Post("deduct-fee")
  @HttpCode(200)
  async deductFee(@Req() req: { user: { id: string; role?: string } }, @Body() dto: DeductFeeDto) {
    const { user_id: userId, amount } = dto;
    if (!userId || !amount || amount <= 0) {
      throw new BadRequestException("Invalid user_id or amount");
    }
    if (req.user && req.user.id !== userId && req.user.role !== "admin") {
      throw new UnauthorizedException(
        "You can only deduct fees from your own account",
      );
    }
    await this.walletService.deductBidFee(userId, amount);
    return { deducted: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get("user/:id")
  async resolveUserName(
    @Param("id") id: string,
    @Req() req: { user: { id: string; role?: string } },
  ) {
    if (req.user && req.user.id !== id && req.user.role !== "admin") {
      throw new ForbiddenException("Cannot access other users' details");
    }
    const user = await this.walletService.resolveUser(id);
    if (!user) throw new NotFoundException("User not found");
    return {
      id: user.id,
      full_name: user.full_name,
      phone_number: user.phone_number,
    };
  }

  @UseGuards(InternalAuthGuard)
  @Get("user/:id/internal")
  async resolveUserNameInternal(@Param("id") id: string) {
    const user = await this.walletService.resolveUser(id);
    if (!user) throw new NotFoundException("User not found");
    return {
      id: user.id,
      full_name: user.full_name,
      phone_number: user.phone_number,
    };
  }
}
