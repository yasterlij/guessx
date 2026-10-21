import { Prisma, PrismaClient } from "@prisma/client";

export class PrismaRepository<T extends keyof PrismaClient> {
  constructor(
    protected prisma: PrismaClient,
    protected model: T,
  ) {}

  protected get delegate() {
    return (this.prisma as any)[this.model];
  }

  private cleanOptions(options: any): any {
    if (!options) return {};
    const cleaned: any = {};
    for (const [key, value] of Object.entries(options)) {
      if (value !== undefined && value !== null) {
        if (key === "order" || key === "orderBy") {
          const orderBy: any = {};
          if (typeof value === "string") {
            cleaned["orderBy"] = value;
            continue;
          }
          for (const [field, dir] of Object.entries(value as any)) {
            orderBy[field] = typeof dir === "string" ? dir.toLowerCase() : dir;
          }
          cleaned["orderBy"] = orderBy;
        } else if (key === "where" && typeof value === "object") {
          cleaned[key] = this.cleanWhere(value as any);
        } else if (key === "relations" || key === "include") {
          cleaned["include"] = value;
        } else if (key === "select") {
          cleaned[key] = value;
        } else if (key === "lock") {
          continue;
        } else {
          cleaned[key] = value;
        }
      }
    }
    return cleaned;
  }

  private cleanWhere(where: any): any {
    if (!where || typeof where !== "object") return where;
    const cleaned: any = {};
    for (const [key, value] of Object.entries(where)) {
      if (value === undefined || value === null) continue;
      if (key === "id" && typeof value === "string") {
        cleaned[key] = value;
      } else if (typeof value === "object" && !Array.isArray(value)) {
        const nested: any = {};
        for (const [k, v] of Object.entries(value as any)) {
          if (v === undefined || v === null) continue;
          if (
            k === "lt" ||
            k === "lte" ||
            k === "gt" ||
            k === "gte" ||
            k === "contains" ||
            k === "in" ||
            k === "not"
          ) {
            nested[k] = v;
          } else {
            nested[k] = v;
          }
        }
        if (Object.keys(nested).length > 0) cleaned[key] = nested;
      } else {
        cleaned[key] = value;
      }
    }
    return cleaned;
  }

  async findOne(options: any): Promise<any> {
    const opts = this.cleanOptions(options);
    if (opts.where?.id) {
      return this.delegate.findUnique({
        where: opts.where,
        select: opts.select,
        include: opts.include,
      });
    }
    return this.delegate.findFirst({
      where: opts.where,
      select: opts.select,
      include: opts.include,
      orderBy: opts.orderBy,
    });
  }

  async find(options: any): Promise<any[]> {
    const opts = this.cleanOptions(options);
    return this.delegate.findMany({
      where: opts.where,
      select: opts.select,
      orderBy: opts.orderBy,
      take: opts.take,
      skip: opts.skip,
      include: opts.include,
    });
  }

  async count(options: any): Promise<number> {
    const opts = this.cleanOptions(options);
    return this.delegate.count({ where: opts.where });
  }

  private validFields: Set<string> | null = null;

  private getValidFields(): Set<string> | null {
    if (this.validFields) return this.validFields;
    const modelMeta = (Prisma as any).dmmf?.datamodel?.models?.find(
      (m: any) => m.name.toLowerCase() === String(this.model).toLowerCase(),
    );
    if (!modelMeta) return null;
    this.validFields = new Set(
      modelMeta.fields
        .filter((f: any) => f.kind === "scalar" || f.kind === "enum")
        .map((f: any) => f.name),
    );
    return this.validFields;
  }

  private cleanData(data: any, isUpdate = false): any {
    if (!data || typeof data !== "object" || Array.isArray(data)) return data;
    const validFields = this.getValidFields();
    const cleaned: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue;
      if (isUpdate && key === "id") continue;
      if (validFields && !validFields.has(key)) continue;
      cleaned[key] = value;
    }
    return cleaned;
  }

  async save(entity: any): Promise<any> {
    if (Array.isArray(entity)) {
      return this.delegate.createMany({
        data: entity.map((e: any) => this.cleanData(e, false)),
      });
    }
    if (entity.id) {
      return this.delegate.update({
        where: { id: entity.id },
        data: this.cleanData(entity, true),
      });
    }
    return this.delegate.create({ data: this.cleanData(entity, false) });
  }

  create(data: any): any {
    if (Array.isArray(data)) {
      return data.map((e: any) => this.cleanData(e, false));
    }
    return this.cleanData(data, false);
  }

  async update(where: any, data: any): Promise<any> {
    const cleaned = this.cleanData(data, true);
    if (typeof where === "string") {
      return this.delegate.update({ where: { id: where }, data: cleaned });
    }
    return this.delegate.updateMany({
      where: this.cleanWhere(where),
      data: cleaned,
    });
  }

  async remove(entity: any): Promise<any> {
    if (typeof entity === "string" || typeof entity === "number") {
      return this.delegate.delete({ where: { id: entity } });
    }
    if (entity?.id) {
      return this.delegate.delete({ where: { id: entity.id } });
    }
    return this.delegate.deleteMany({ where: this.cleanWhere(entity) });
  }

  async delete(options: any): Promise<any> {
    if (options?.id) {
      return this.delegate.delete({ where: { id: options.id } });
    }
    return this.delegate.deleteMany({
      where: this.cleanWhere(options?.where || options),
    });
  }

  async findAndCount(options: any): Promise<[any[], number]> {
    const opts = this.cleanOptions(options);
    const [data, total] = await Promise.all([
      this.delegate.findMany({
        where: opts.where,
        select: opts.select,
        orderBy: opts.orderBy,
        take: opts.take,
        skip: opts.skip,
        include: opts.include,
      }),
      this.delegate.count({ where: opts.where }),
    ]);
    return [data, total];
  }

  async increment(where: any, field: string, value: number): Promise<any> {
    return this.delegate.updateMany({
      where: this.cleanWhere(where),
      data: { [field]: { increment: value } },
    });
  }

  async upsert(data: any, conflictFields: string[]): Promise<any> {
    const w: any = {};
    for (const f of conflictFields) w[f] = data[f];
    return this.delegate.upsert({
      where: w,
      create: data,
      update: data,
    });
  }

  createQueryBuilder(alias: string) {
    return new PrismaQueryBuilder(this.prisma, this.model, alias);
  }

  query(sql: string, params?: any[]): Promise<any> {
    return this.prisma.$queryRawUnsafe(sql, ...(params || []));
  }
}

export class PrismaQueryBuilder<T extends keyof PrismaClient> {
  private whereClause: any = {};
  private order: any[] = [];
  private limit?: number;
  private offset?: number;
  private selects: string[] = [];

  constructor(
    private prisma: PrismaClient,
    private model: T,
    private alias: string,
  ) {}

  select(...fields: string[]) {
    this.selects = fields;
    return this;
  }

  addSelect(field: string) {
    this.selects.push(field);
    return this;
  }

  where(condition: any) {
    this.whereClause = { ...this.whereClause, ...condition };
    return this;
  }

  andWhere(condition: any) {
    this.whereClause = { ...this.whereClause, ...condition };
    return this;
  }

  orderBy(field: string, dir: "ASC" | "DESC" = "ASC") {
    this.order.push({ [field]: dir.toLowerCase() });
    return this;
  }

  take(limit: number) {
    this.limit = limit;
    return this;
  }

  skip(offset: number) {
    this.offset = offset;
    return this;
  }

  async getRawMany(): Promise<any[]> {
    return (this.prisma as any)[this.model].findMany({
      where: this.whereClause,
      orderBy: this.order,
      take: this.limit,
      skip: this.offset,
    });
  }

  async getRawOne(): Promise<any> {
    return (this.prisma as any)[this.model].findFirst({
      where: this.whereClause,
      orderBy: this.order,
      take: 1,
    });
  }

  async getMany(): Promise<any[]> {
    return (this.prisma as any)[this.model].findMany({
      where: this.whereClause,
      orderBy: this.order,
      take: this.limit,
      skip: this.offset,
    });
  }

  async getOne(): Promise<any> {
    return (this.prisma as any)[this.model].findFirst({
      where: this.whereClause,
      orderBy: this.order,
      take: 1,
    });
  }

  async getCount(): Promise<number> {
    return (this.prisma as any)[this.model].count({ where: this.whereClause });
  }
}
