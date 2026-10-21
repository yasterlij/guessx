import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Like, Repository } from "typeorm";
import { Product } from "./entities/product.entity";
import { CreateProductDto, UpdateProductDto } from "./dto/admin.dto";
import { ImageService } from "./image.service";
import { normalizeProductCategory } from "./product-categories";

@Injectable()
export class ProductAdminService {
  private readonly logger = new Logger(ProductAdminService.name);
  private readonly specKeys = [
    "storage",
    "ram",
    "edition",
    "battery",
    "camera",
    "osVersion",
    "display",
    "chipset",
  ] as const;

  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private imageService: ImageService,
  ) {}

  private isMissingColumnError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return (
      message.includes("public_code") ||
      message.includes("specs") ||
      message.includes("approval_status") ||
      message.includes("approved_by") ||
      message.includes("approved_at") ||
      message.includes("does not exist") ||
      message.includes("column")
    );
  }

  private async listProductsFallback(page = 1, limit = 20, search?: string) {
    const offset = (page - 1) * limit;
    const params: any[] = [];
    let where = "";
    if (search) {
      params.push(`%${search}%`);
      where = `WHERE name ILIKE $${params.length}`;
    }
    params.push(limit, offset);
    const rows = await this.productRepository.query(
      `SELECT id, name, description, image_urls, current_market_price, category, brand, created_at
       FROM products
       ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    const countRows = await this.productRepository.query(
      `SELECT COUNT(*)::int AS total FROM products ${where}`,
      search ? [`%${search}%`] : [],
    );
    const total = countRows[0]?.total || 0;
    return {
      data: rows.map((row: any) => ({
        ...row,
        category: normalizeProductCategory(row.category, row.name),
        specs: null,
      })),
      meta: { total, page, limit, total_pages: Math.ceil(total / limit) },
    };
  }

  private normalizeSpecs(specs?: Record<string, string>) {
    if (!specs || typeof specs !== "object") return null;
    const normalized = this.specKeys.reduce<Record<string, string>>(
      (acc, key) => {
        const value = specs[key];
        if (typeof value === "string" && value.trim()) acc[key] = value.trim();
        return acc;
      },
      {},
    );
    return Object.keys(normalized).length ? normalized : null;
  }

  async listProducts(page = 1, limit = 20, search?: string) {
    try {
      const where: any = {};
      if (search) where.name = Like(`%${search}%`);
      const [data, total] = await this.productRepository.findAndCount({
        where,
        order: { created_at: "DESC" },
        skip: (page - 1) * limit,
        take: limit,
      });
      return {
        data,
        meta: { total, page, limit, total_pages: Math.ceil(total / limit) },
      };
    } catch (error) {
      if (!this.isMissingColumnError(error)) throw error;
      return this.listProductsFallback(page, limit, search);
    }
  }

  async listPendingProducts(page = 1, limit = 20) {
    const [data, total] = await this.productRepository.findAndCount({
      where: { approval_status: "PENDING" },
      order: { created_at: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      data,
      meta: { total, page, limit, total_pages: Math.ceil(total / limit) },
    };
  }

  async createProduct(dto: CreateProductDto) {
    const data = { ...dto };
    if (data.image_urls?.length) {
      data.image_urls = await this.imageService.processImageUrls(
        data.image_urls,
      );
    }
    data.category = normalizeProductCategory(data.category, data.name);
    data.specs = this.normalizeSpecs(data.specs) ?? undefined;
    try {
      return await this.productRepository.save(
        this.productRepository.create(data),
      );
    } catch (error) {
      if (!this.isMissingColumnError(error)) throw error;
      const rows = await this.productRepository.query(
        `INSERT INTO products (name, description, image_urls, current_market_price, category)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, name, description, image_urls, current_market_price, category, brand, created_at`,
        [
          data.name,
          data.description || null,
          data.image_urls || null,
          data.current_market_price,
          data.category,
        ],
      );
      return {
        ...rows[0],
        category: normalizeProductCategory(rows[0]?.category, data.name),
        specs: null,
      };
    }
  }

  async updateProduct(id: string, dto: UpdateProductDto) {
    let product = null as any;
    try {
      product = await this.productRepository.findOne({ where: { id } });
    } catch (error) {
      if (!this.isMissingColumnError(error)) throw error;
      const rows = await this.productRepository.query(
        `SELECT id, name, description, image_urls, current_market_price, brand, created_at FROM products WHERE id = $1 LIMIT 1`,
        [id],
      );
      product = rows[0] || null;
    }
    if (!product) throw new NotFoundException("Product not found");
    const data = { ...dto };
    if (data.image_urls?.length) {
      data.image_urls = await this.imageService.processImageUrls(
        data.image_urls,
      );
    }
    if (data.category !== undefined) {
      data.category = normalizeProductCategory(
        data.category,
        data.name ?? product.name,
      );
    }
    if (data.specs !== undefined) {
      data.specs = this.normalizeSpecs(data.specs) ?? undefined;
    }
    Object.assign(product, data);
    try {
      return await this.productRepository.save(product);
    } catch (error) {
      if (!this.isMissingColumnError(error)) throw error;
      const rows = await this.productRepository.query(
        `UPDATE products
         SET name = $2, description = $3, image_urls = $4, current_market_price = $5, category = $6
         WHERE id = $1
         RETURNING id, name, description, image_urls, current_market_price, category, brand, created_at`,
        [
          id,
          product.name,
          product.description || null,
          product.image_urls || null,
          product.current_market_price,
          product.category,
        ],
      );
      return {
        ...rows[0],
        category: normalizeProductCategory(product.category, product.name),
        specs: null,
      };
    }
  }

  async deleteProduct(id: string) {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) throw new NotFoundException("Product not found");
    await this.productRepository.remove(product);
    return { deleted: true, id };
  }

  async approveProduct(id: string, actorId?: string) {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) throw new NotFoundException("Product not found");
    product.approval_status = "APPROVED";
    product.approved_by = actorId || null;
    product.approved_at = new Date();
    return this.productRepository.save(product);
  }

  async rejectProduct(id: string, actorId?: string, _reason?: string) {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) throw new NotFoundException("Product not found");
    product.approval_status = "REJECTED";
    product.approved_by = actorId || null;
    product.approved_at = new Date();
    return this.productRepository.save(product);
  }

  async downloadProductImages(id: string) {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) throw new NotFoundException("Product not found");
    if (!product.image_urls?.length) {
      return { downloaded: 0, message: "No images to download" };
    }
    const localUrls = await this.imageService.processImageUrls(
      product.image_urls,
    );
    product.image_urls = localUrls;
    await this.productRepository.save(product);
    const downloaded = localUrls.filter((u) =>
      u.startsWith("/uploads/"),
    ).length;
    return { downloaded, total: product.image_urls.length };
  }

  async downloadAllProductImages() {
    const products = await this.productRepository.find();
    let total = 0;
    for (const product of products) {
      if (!product.image_urls?.length) continue;
      const localUrls = await this.imageService.processImageUrls(
        product.image_urls,
      );
      product.image_urls = localUrls;
      await this.productRepository.save(product);
      total += localUrls.filter((u) => u.startsWith("/uploads/")).length;
    }
    return { downloaded: total, products: products.length };
  }

  async bulkDeleteProducts(ids: string[]) {
    const products = await this.productRepository.find({
      where: { id: In(ids) },
    });
    await this.productRepository.remove(products);
    return { deleted: products.length };
  }

  async exportProductsCsv(search?: string) {
    const where: any = {};
    if (search) where.name = Like(`%${search}%`);
    let products: any[] = [];
    try {
      products = await this.productRepository.find({
        where,
        order: { created_at: "DESC" },
      });
    } catch (error) {
      if (!this.isMissingColumnError(error)) throw error;
      const fallback = await this.listProductsFallback(1, 100000, search);
      products = fallback.data;
    }
    const header =
      "id,name,description,category,current_market_price,specs,created_at";
    const rows = products.map((p) =>
      [
        p.id,
        p.name,
        (p.description || "").replace(/,/g, ";"),
        p.category || normalizeProductCategory(undefined, p.name),
        p.current_market_price,
        JSON.stringify(p.specs || {}).replace(/,/g, ";"),
        p.created_at,
      ].join(","),
    );
    return [header, ...rows].join("\n");
  }
}
