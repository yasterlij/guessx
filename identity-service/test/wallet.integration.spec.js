"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const wallet_service_1 = require("../src/modules/wallet/wallet.service");
const user_entity_1 = require("../src/modules/auth/entities/user.entity");
const transaction_entity_1 = require("../src/modules/wallet/entities/transaction.entity");
describe('WalletService Integration (Section 11.2)', () => {
    let service;
    let mockUserRepo;
    let mockTxRepo;
    let mockDataSource;
    let mockQueryRunner;
    beforeEach(async () => {
        mockQueryRunner = {
            connect: jest.fn(),
            startTransaction: jest.fn(),
            commitTransaction: jest.fn(),
            rollbackTransaction: jest.fn(),
            release: jest.fn(),
            manager: {
                findOne: jest.fn(),
                save: jest.fn(),
                create: jest.fn(),
                query: jest.fn(),
            },
        };
        mockDataSource = {
            createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
        };
        mockUserRepo = {
            findOne: jest.fn(),
        };
        mockTxRepo = {
            findOne: jest.fn(),
        };
        const module = await testing_1.Test.createTestingModule({
            providers: [
                wallet_service_1.WalletService,
                { provide: (0, typeorm_1.getRepositoryToken)(user_entity_1.User), useValue: mockUserRepo },
                { provide: (0, typeorm_1.getRepositoryToken)(transaction_entity_1.Transaction), useValue: mockTxRepo },
                { provide: typeorm_2.DataSource, useValue: mockDataSource },
            ],
        }).compile();
        service = module.get(wallet_service_1.WalletService);
    });
    describe('deductBidFee', () => {
        it('should deduct bid fee from wallet balance', async () => {
            const user = {
                id: 'user-1',
                wallet_balance: 100,
                phone_number: '+251911111111',
            };
            mockQueryRunner.manager.findOne.mockResolvedValue(user);
            mockQueryRunner.manager.save.mockResolvedValue({ ...user, wallet_balance: 50 });
            await service.deductBidFee('user-1', 50);
            expect(mockQueryRunner.manager.save).toHaveBeenCalled();
            const savedUser = mockQueryRunner.manager.save.mock.calls[0][0];
            expect(savedUser.wallet_balance).toBe(50);
            expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
        });
        it('should throw Insufficient Funds when balance < fee', async () => {
            const user = {
                id: 'user-1',
                wallet_balance: 30,
            };
            mockQueryRunner.manager.findOne.mockResolvedValue(user);
            await expect(service.deductBidFee('user-1', 50)).rejects.toThrow('Insufficient wallet balance');
            expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
        });
    });
});
//# sourceMappingURL=wallet.integration.spec.js.map