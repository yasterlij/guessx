import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "./roles.decorator";

const STAFF_ROLES = new Set([
  "admin",
  "CEO",
  "CXO",
  "DIRECTOR",
  "MANAGER",
  "EXPERT",
  "SPECIALIST",
  "ANALYST",
]);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException("Not authenticated");

    const hasRole = requiredRoles.some((role) => {
      if (user.role === role) return true;
      if (role === "admin" && STAFF_ROLES.has(user.role)) return true;
      return false;
    });
    if (!hasRole) throw new ForbiddenException("Admin access required");

    return true;
  }
}
