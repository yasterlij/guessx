import { Injectable, Inject } from "@nestjs/common";

export const REDIS_CLIENT = "REDIS_CLIENT";

export function InjectRedis() {
  return Inject(REDIS_CLIENT);
}
