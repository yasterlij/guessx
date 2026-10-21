// @ts-ignore - CASL types require bundler moduleResolution
import { AbilityBuilder, PureAbility } from '@casl/ability';
import { AppAction, AppSubject, AppRole, UserContext, getRoleLevel } from './rbac.constants';

type AppAbility = PureAbility<any, any>;

export type { AppAbility };

export function createAbilityForUser(user: UserContext): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<any>(PureAbility as any);
  const role = user.role as AppRole;
  const level = getRoleLevel(role);

  switch (role) {
    case AppRole.CEO:
    case AppRole.ADMIN:
      can(AppAction.MANAGE, AppSubject.ALL);
      break;

    case AppRole.CXO:
      can(AppAction.MANAGE, AppSubject.AUCTION);
      can(AppAction.MANAGE, AppSubject.PRODUCT);
      can(AppAction.MANAGE, AppSubject.PAYMENT);
      can(AppAction.MANAGE, AppSubject.WINNER);
      can(AppAction.MANAGE, AppSubject.WALLET);
      can(AppAction.MANAGE, AppSubject.TRANSACTION);
      can(AppAction.MANAGE, AppSubject.SETTLEMENT);
      can(AppAction.READ, AppSubject.ANALYTICS);
      can(AppAction.READ, AppSubject.AUDIT_LOG);
      can(AppAction.READ, AppSubject.USER);
      can(AppAction.MANAGE, AppSubject.DISPUTE);
      can(AppAction.MANAGE, AppSubject.DIVISION);
      can(AppAction.MANAGE, AppSubject.DEPARTMENT);
      can(AppAction.MANAGE, AppSubject.SECTION);
      can(AppAction.EXPORT, AppSubject.USER);
      can(AppAction.EXPORT, AppSubject.TRANSACTION);
      can(AppAction.EXPORT, AppSubject.AUCTION);
      can(AppAction.EXPORT, AppSubject.SETTLEMENT);
      can(AppAction.EXPORT, AppSubject.AUDIT_LOG);
      cannot(AppAction.DELETE, AppSubject.USER, { reason: 'CXO cannot delete users' });
      cannot(AppAction.GRANT, AppSubject.PERMISSION, { reason: 'Only CEO/Admin can grant permissions' });
      cannot(AppAction.REVOKE, AppSubject.PERMISSION, { reason: 'Only CEO/Admin can revoke permissions' });
      break;

    case AppRole.DIRECTOR:
      can(AppAction.MANAGE, AppSubject.AUCTION);
      can(AppAction.MANAGE, AppSubject.PRODUCT);
      can(AppAction.READ, AppSubject.PAYMENT);
      can(AppAction.READ, AppSubject.WINNER);
      can(AppAction.READ, AppSubject.WALLET);
      can(AppAction.READ, AppSubject.TRANSACTION);
      can(AppAction.MANAGE, AppSubject.SETTLEMENT);
      can(AppAction.READ, AppSubject.ANALYTICS);
      can(AppAction.READ, AppSubject.AUDIT_LOG);
      can(AppAction.READ, AppSubject.USER);
      can(AppAction.MANAGE, AppSubject.DISPUTE);
      can(AppAction.MANAGE, AppSubject.DEPARTMENT);
      can(AppAction.MANAGE, AppSubject.SECTION);
      can(AppAction.EXPORT, AppSubject.TRANSACTION);
      can(AppAction.EXPORT, AppSubject.AUCTION);
      can(AppAction.EXPORT, AppSubject.SETTLEMENT);
      can(AppAction.APPROVE, AppSubject.PRODUCT);
      can(AppAction.REJECT, AppSubject.PRODUCT);
      can(AppAction.FORCE_CLOSE, AppSubject.AUCTION);
      can(AppAction.DRAW_WINNER, AppSubject.AUCTION);
      cannot(AppAction.DELETE, AppSubject.USER);
      cannot(AppAction.BAN, AppSubject.USER);
      cannot(AppAction.GRANT, AppSubject.PERMISSION);
      cannot(AppAction.REVOKE, AppSubject.PERMISSION);
      cannot(AppAction.MANAGE, AppSubject.DIVISION);
      break;

    case AppRole.MANAGER:
      can(AppAction.READ, AppSubject.AUCTION);
      can(AppAction.CREATE, AppSubject.AUCTION);
      can(AppAction.UPDATE, AppSubject.AUCTION);
      can(AppAction.FORCE_CLOSE, AppSubject.AUCTION);
      can(AppAction.DRAW_WINNER, AppSubject.AUCTION);
      can(AppAction.MANAGE, AppSubject.PRODUCT);
      can(AppAction.APPROVE, AppSubject.PRODUCT);
      can(AppAction.REJECT, AppSubject.PRODUCT);
      can(AppAction.READ, AppSubject.PAYMENT);
      can(AppAction.READ, AppSubject.WINNER);
      can(AppAction.EXTEND, AppSubject.WINNER);
      can(AppAction.CONFIRM, AppSubject.WINNER);
      can(AppAction.ROTATE, AppSubject.WINNER);
      can(AppAction.READ, AppSubject.WALLET);
      can(AppAction.READ, AppSubject.TRANSACTION);
      can(AppAction.READ, AppSubject.SETTLEMENT);
      can(AppAction.EXPORT, AppSubject.SETTLEMENT);
      can(AppAction.READ, AppSubject.ANALYTICS);
      can(AppAction.READ, AppSubject.AUDIT_LOG);
      can(AppAction.READ, AppSubject.USER);
      can(AppAction.MANAGE, AppSubject.DISPUTE);
      can(AppAction.MANAGE, AppSubject.SECTION);
      can(AppAction.EXPORT, AppSubject.AUCTION);
      cannot(AppAction.DELETE, AppSubject.AUCTION);
      cannot(AppAction.DELETE, AppSubject.USER);
      cannot(AppAction.BAN, AppSubject.USER);
      cannot(AppAction.MANAGE, AppSubject.DIVISION);
      cannot(AppAction.MANAGE, AppSubject.DEPARTMENT);
      cannot(AppAction.GRANT, AppSubject.PERMISSION);
      cannot(AppAction.REVOKE, AppSubject.PERMISSION);
      break;

    case AppRole.EXPERT:
      can(AppAction.READ, AppSubject.AUCTION);
      can(AppAction.CREATE, AppSubject.AUCTION);
      can(AppAction.UPDATE, AppSubject.AUCTION);
      can(AppAction.READ, AppSubject.PRODUCT);
      can(AppAction.CREATE, AppSubject.PRODUCT);
      can(AppAction.UPDATE, AppSubject.PRODUCT);
      can(AppAction.READ, AppSubject.PAYMENT);
      can(AppAction.READ, AppSubject.WINNER);
      can(AppAction.READ, AppSubject.WALLET);
      can(AppAction.READ, AppSubject.TRANSACTION);
      can(AppAction.READ, AppSubject.SETTLEMENT);
      can(AppAction.READ, AppSubject.ANALYTICS);
      can(AppAction.READ, AppSubject.AUDIT_LOG);
      can(AppAction.READ, AppSubject.USER);
      can(AppAction.READ, AppSubject.DISPUTE);
      can(AppAction.UPDATE, AppSubject.DISPUTE);
      can(AppAction.EXPORT, AppSubject.AUCTION);
      can(AppAction.EXPORT, AppSubject.TRANSACTION);
      cannot(AppAction.DELETE, AppSubject.ALL);
      cannot(AppAction.BAN, AppSubject.USER);
      cannot(AppAction.FORCE_CLOSE, AppSubject.AUCTION);
      cannot(AppAction.GRANT, AppSubject.PERMISSION);
      cannot(AppAction.REVOKE, AppSubject.PERMISSION);
      cannot(AppAction.MANAGE, AppSubject.DIVISION);
      cannot(AppAction.MANAGE, AppSubject.DEPARTMENT);
      cannot(AppAction.MANAGE, AppSubject.SECTION);
      break;

    case AppRole.SPECIALIST:
      can(AppAction.READ, AppSubject.AUCTION);
      can(AppAction.READ, AppSubject.PRODUCT);
      can(AppAction.READ, AppSubject.PAYMENT);
      can(AppAction.READ, AppSubject.WINNER);
      can(AppAction.READ, AppSubject.TRANSACTION);
      can(AppAction.READ, AppSubject.SETTLEMENT);
      can(AppAction.READ, AppSubject.ANALYTICS);
      can(AppAction.READ, AppSubject.DISPUTE);
      can(AppAction.UPDATE, AppSubject.DISPUTE);
      can(AppAction.EXPORT, [AppSubject.AUCTION, AppSubject.TRANSACTION, AppSubject.SETTLEMENT]);
      cannot(AppAction.MANAGE, AppSubject.ALL);
      cannot(AppAction.CREATE, AppSubject.AUCTION);
      cannot(AppAction.UPDATE, AppSubject.AUCTION);
      cannot(AppAction.DELETE, AppSubject.ALL);
      cannot(AppAction.BAN, AppSubject.USER);
      cannot(AppAction.GRANT, AppSubject.PERMISSION);
      cannot(AppAction.REVOKE, AppSubject.PERMISSION);
      break;

    case AppRole.ANALYST:
      can(AppAction.READ, AppSubject.AUCTION);
      can(AppAction.READ, AppSubject.PRODUCT);
      can(AppAction.READ, AppSubject.ANALYTICS);
      can(AppAction.READ, AppSubject.SETTLEMENT);
      can(AppAction.EXPORT, [AppSubject.AUCTION, AppSubject.SETTLEMENT]);
      cannot(AppAction.MANAGE, AppSubject.ALL);
      cannot(AppAction.CREATE, AppSubject.ALL);
      cannot(AppAction.UPDATE, AppSubject.ALL);
      cannot(AppAction.DELETE, AppSubject.ALL);
      cannot(AppAction.READ, AppSubject.USER);
      cannot(AppAction.READ, AppSubject.WALLET);
      cannot(AppAction.READ, AppSubject.PAYMENT);
      cannot(AppAction.READ, AppSubject.AUDIT_LOG);
      break;

    default:
      can(AppAction.READ, AppSubject.AUCTION);
      can(AppAction.READ, AppSubject.PRODUCT);
      can(AppAction.CREATE, AppSubject.BID);
      can(AppAction.READ, AppSubject.BID);
      can(AppAction.READ, AppSubject.WALLET);
      can(AppAction.MANAGE, AppSubject.FAVORITE);
      can(AppAction.READ, AppSubject.NOTIFICATION);
      can(AppAction.MANAGE, AppSubject.DISPUTE);
      can(AppAction.READ, AppSubject.WINNER, { user_id: user.id });
      cannot(AppAction.MANAGE, AppSubject.ALL);
      break;
  }

  return build();
}

export function checkPermission(
  ability: AppAbility,
  action: AppAction,
  subject: AppSubject,
  resource?: any,
): boolean {
  return ability.can(action, subject, resource);
}