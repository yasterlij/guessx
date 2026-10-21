import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { RolesGuard } from "../common/roles.guard";
import { Roles } from "../common/roles.decorator";
import { ProductAdminService } from "./product-admin.service";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";

@ApiTags("admin-product-approval")
@ApiBearerAuth()
@Controller("admin/products")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin")
export class ProductApprovalController {
  constructor(private productService: ProductAdminService) {}

  @Get("pending")
  @ApiOperation({ summary: "List pending products" })
  async listPendingProducts(
    @Query("page") page = "1",
    @Query("limit") limit = "20",
  ) {
    return this.productService.listPendingProducts(
      parseInt(page),
      parseInt(limit),
    );
  }

  @Post(":id/approve")
  @ApiOperation({ summary: "Approve product" })
  async approveProduct(
    @Param("id") id: string,
    @Req() req: { user: { id: string; role?: string } },
  ) {
    return this.productService.approveProduct(id, req.user?.id);
  }

  @Post(":id/reject")
  @ApiOperation({ summary: "Reject product" })
  async rejectProduct(
    @Param("id") id: string,
    @Req() req: { user: { id: string; role?: string } },
    @Body("reason") reason?: string,
  ) {
    return this.productService.rejectProduct(id, req.user?.id, reason);
  }
}
