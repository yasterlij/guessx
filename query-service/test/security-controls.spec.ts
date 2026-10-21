import { AuditViewerService } from '../src/modules/common/audit/audit-viewer.service';

describe('Query Service Security Controls', () => {
  describe('AuditViewerService CSV Formula Injection Protection', () => {
    let service: AuditViewerService;
    let mockPrisma: any;

    beforeEach(() => {
      mockPrisma = {
        auditLog: {
          findMany: jest.fn(),
          count: jest.fn(),
        },
      };
      service = new AuditViewerService(mockPrisma);
    });

    it('should prepend single quote to fields starting with formula characters', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValueOnce([
        {
          id: 'log-1',
          actor_id: 'actor-123',
          actor_phone: '=cmd|"/C calc"!A0',
          action: '+SUM(1,1)',
          entity_type: '@HYPERLINK',
          entity_id: 'ent-1',
          created_at: new Date('2026-10-16T12:00:00Z'),
          details: { note: '-2+5' },
        },
      ]);

      const csv = await service.exportAuditLogsCsv({});
      const lines = csv.split('\n');
      expect(lines).toHaveLength(2);

      const dataRow = lines[1];
      // Formula chars should be escaped with leading single quote
      expect(dataRow).toContain("'=cmd");
      expect(dataRow).toContain("'+SUM");
      expect(dataRow).toContain("'@HYPERLINK");
    });

    it('should escape commas and quotes properly', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValueOnce([
        {
          id: 'log-2',
          actor_id: 'actor-456',
          actor_phone: '0911223344',
          action: 'update,role',
          entity_type: 'user "admin"',
          entity_id: 'ent-2',
          created_at: new Date('2026-10-16T12:00:00Z'),
          details: null,
        },
      ]);

      const csv = await service.exportAuditLogsCsv({});
      const lines = csv.split('\n');
      const dataRow = lines[1];
      expect(dataRow).toContain('"update,role"');
      expect(dataRow).toContain('"user ""admin"""');
    });
  });

  describe('AuctionsController Closed Auctions Admin Access Control (Rule 5)', () => {
    let rolesGuard: any;
    let reflector: any;

    beforeEach(async () => {
      const { RolesGuard } = await import('../src/modules/common/roles.guard');
      const { Reflector } = await import('@nestjs/core');
      reflector = new Reflector();
      rolesGuard = new RolesGuard(reflector);
    });

    function createMockContext(user?: { id: string; role?: string }) {
      return {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({ user }),
        }),
      } as any;
    }

    it('should reject unauthenticated access when admin role is required', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
      expect(() => rolesGuard.canActivate(createMockContext(undefined))).toThrow(
        'Not authenticated',
      );
    });

    it('should reject regular user from accessing closed auctions', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
      expect(() =>
        rolesGuard.canActivate(createMockContext({ id: 'u-1', role: 'user' })),
      ).toThrow('Admin access required');
    });

    it('should allow admin user to access closed auctions', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
      const result = rolesGuard.canActivate(
        createMockContext({ id: 'u-admin', role: 'admin' }),
      );
      expect(result).toBe(true);
    });
  });
});
