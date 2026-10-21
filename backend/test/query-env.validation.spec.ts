import 'reflect-metadata';
import { validate } from '../src/config/env.validation';

describe('env.validation', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('should throw when DATABASE_URL is missing', () => {
    delete process.env.DATABASE_URL;
    delete process.env.JWT_SECRET;
    expect(() => validate({})).toThrow('Environment validation failed');
  });

  it('should throw when JWT_SECRET is missing', () => {
    process.env.DATABASE_URL = 'postgresql://admin:secret@localhost:5432/guessx_db';
    delete process.env.JWT_SECRET;
    expect(() =>
      validate({ DATABASE_URL: process.env.DATABASE_URL }),
    ).toThrow('Environment validation failed');
  });

  it('should pass when DATABASE_URL and JWT_SECRET are provided', () => {
    const result = validate({
      DATABASE_URL: 'postgresql://admin:secret@localhost:5432/guessx_db',
      JWT_SECRET: 'a-real-secret-not-the-default',
      JWT_REFRESH_SECRET: 'a-real-refresh-secret',
      REDIS_URL: 'redis://localhost:6379',
      INTERNAL_API_KEY: 'test-internal-api-key',
      PORT: '3003',
    });
    expect(result.DATABASE_URL).toBe(
      'postgresql://admin:secret@localhost:5432/guessx_db',
    );
    expect(result.JWT_SECRET).toBe('a-real-secret-not-the-default');
  });
});
