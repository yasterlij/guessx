import { validate } from 'class-validator';
import { BidDto as PlaceBidDto } from '../src/modules/bidding/dto/bid.dto';

describe('PlaceBidDto Validation', () => {
  it('should accept decimal 2.50', async () => {
    const dto = new PlaceBidDto();
    dto.amount = 2.5;
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should accept 1.00 (minimum)', async () => {
    const dto = new PlaceBidDto();
    dto.amount = 1.00;
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should reject values below 1.00', async () => {
    const dto = new PlaceBidDto();
    dto.amount = 0.99;
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject negative values', async () => {
    const dto = new PlaceBidDto();
    (dto as any).amount = -1;
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject zero', async () => {
    const dto = new PlaceBidDto();
    (dto as any).amount = 0;
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject string values', async () => {
    const dto = new PlaceBidDto();
    (dto as any).amount = 'not-a-number';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject values with more than 2 decimal places', async () => {
    const dto = new PlaceBidDto();
    (dto as any).amount = 2.345;
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should accept 999999.99 (maximum)', async () => {
    const dto = new PlaceBidDto();
    dto.amount = 999999.99;
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should reject values exceeding 999999.99', async () => {
    const dto = new PlaceBidDto();
    (dto as any).amount = 1000000.00;
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should accept integer 2', async () => {
    const dto = new PlaceBidDto();
    dto.amount = 2;
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should accept 92047.23', async () => {
    const dto = new PlaceBidDto();
    dto.amount = 92047.23;
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
