import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

@Injectable()
export class BidEncryptionService {
  private key: Buffer;

  constructor() {
    const raw = process.env.BID_ENCRYPTION_KEY;
    if (!raw) {
      throw new Error('BID_ENCRYPTION_KEY environment variable is not set');
    }
    const salt = process.env.BID_ENCRYPTION_SALT || 'guessx-bid-salt';
    this.key = crypto.scryptSync(raw, salt, 32);
  }

  encrypt(plaintext: number): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(String(plaintext), 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
  }

  decrypt(encoded: string): number {
    if (!encoded || typeof encoded !== 'string') {
      throw new Error('Invalid encrypted payload');
    }
    const parts = encoded.split(':');
    if (parts.length !== 3) {
      throw new Error('Malformed encrypted bid format');
    }
    const [ivB64, tagB64, dataB64] = parts;
    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const encrypted = Buffer.from(dataB64, 'base64');
    const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString('utf8');
    return parseFloat(decrypted);
  }
}