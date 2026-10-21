import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UsePipes,
  ValidationPipe,
  UseGuards,
  Res,
} from "@nestjs/common";
import { AuctionAdminService } from "./auction-admin.service";
import { AuctionReviewService } from "./auction-review.service";
import { ProductAdminService } from "./product-admin.service";
import {
  CreateProductDto,
  UpdateProductDto,
  CreateAuctionDto,
  UpdateAuctionDto,
} from "./dto/admin.dto";
import { AuctionStatus } from "../winner/entities/auction.entity";
import { RolesGuard } from "../common/roles.guard";
import { Roles } from "../common/roles.decorator";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { Response } from "express";

@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin")
export class AuctionManageController {
  constructor(
    private reviewService: AuctionReviewService,
    private auctionService: AuctionAdminService,
    private productService: ProductAdminService,
  ) {}

  @Get("products")
  async listProducts(
    @Query("page") page = "1",
    @Query("limit") limit = "20",
    @Query("search") search?: string,
  ) {
    return this.productService.listProducts(
      parseInt(page),
      parseInt(limit),
      search,
    );
  }

  @Get("products/export/csv")
  async exportProductsCsv(
    @Query("search") search: string,
    @Res() res: Response,
  ) {
    const csv = await this.productService.exportProductsCsv(search);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Disposition", "attachment; filename=products.csv");
    res.send(csv);
  }

  @Post("products")
  @UsePipes(new ValidationPipe({ transform: true }))
  async createProduct(@Body() dto: CreateProductDto) {
    return this.productService.createProduct(dto);
  }

  @Patch("products/:id")
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateProduct(@Param("id") id: string, @Body() dto: UpdateProductDto) {
    return this.productService.updateProduct(id, dto);
  }

  @Post("products/:id/download-images")
  async downloadProductImages(@Param("id") id: string) {
    return this.productService.downloadProductImages(id);
  }

  @Post("products/download-all-images")
  async downloadAllProductImages() {
    return this.productService.downloadAllProductImages();
  }

  @Delete("products/:id")
  async deleteProduct(@Param("id") id: string) {
    return this.productService.deleteProduct(id);
  }

  @Post("products/bulk-delete")
  async bulkDeleteProducts(@Body() body: { ids: string[] }) {
    return this.productService.bulkDeleteProducts(body.ids);
  }

  @Get("auctions")
  async listAuctions(
    @Query("page") page = "1",
    @Query("limit") limit = "20",
    @Query("status") status?: AuctionStatus,
  ) {
    return this.auctionService.listAuctions(
      parseInt(page),
      parseInt(limit),
      status,
    );
  }

  @Get("auctions/export/csv")
  async exportAuctionsCsv(
    @Query("status") status: AuctionStatus,
    @Res() res: Response,
  ) {
    const csv = await this.auctionService.exportAuctionsCsv(status);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Disposition", "attachment; filename=auctions.csv");
    res.send(csv);
  }

  @Post("auctions")
  @UsePipes(new ValidationPipe({ transform: true }))
  async createAuction(@Body() dto: CreateAuctionDto) {
    return this.auctionService.createAuction(dto);
  }

  @Patch("auctions/:id")
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateAuction(@Param("id") id: string, @Body() dto: UpdateAuctionDto) {
    return this.auctionService.updateAuction(id, dto);
  }

  @Delete("auctions/:id")
  async deleteAuction(@Param("id") id: string) {
    return this.auctionService.deleteAuction(id);
  }

  @Post("auctions/bulk-delete")
  async bulkDeleteAuctions(@Body() body: { ids: string[] }) {
    return this.auctionService.bulkDeleteAuctions(body.ids);
  }

  @Post("auctions/bulk-reopen")
  async bulkReopenAuctions(
    @Body()
    body: {
      auction_ids: string[];
      start_time?: string;
      end_time?: string;
      duration_days?: number;
      bid_fee?: number;
    },
    @Req() req: { user: { id: string; role?: string } },
  ) {
    return this.auctionService.bulkReopenAuctions(body, req.user?.id);
  }

  @Post("auctions/:id/reopen")
  async reopenAuction(
    @Param("id") id: string,
    @Body()
    body: {
      start_time: string;
      end_time?: string;
      duration_days?: number;
      min_bid?: number;
      max_bid?: number;
      bid_fee?: number;
      name?: string;
      category?: string;
      description?: string;
      image_urls?: string[];
      current_market_price?: number;
    },
    @Req() req: { user: { id: string; role?: string } },
  ) {
    return this.auctionService.reopenAuction(id, body, req.user?.id);
  }

  @Post("auctions/:id/close")
  async closeAuction(
    @Param("id") id: string,
    @Req() req: { user: { id: string; role?: string } },
  ) {
    return this.auctionService.closeAuctionEarly(id, req.user?.id);
  }

  @Post("auctions/:id/force-close")
  async forceCloseAuction(
    @Param("id") id: string,
    @Req() req: { user: { id: string; role?: string } },
  ) {
    return this.auctionService.forceCloseAuction(id, req.user?.id);
  }

  @Get("auctions/:id/winner")
  async drawWinner(@Param("id") id: string) {
    return this.reviewService.drawWinner(id);
  }

  @Get("auctions/:id/bids")
  async getAuctionBids(@Param("id") id: string) {
    return this.reviewService.getAuctionBids(id);
  }
}
