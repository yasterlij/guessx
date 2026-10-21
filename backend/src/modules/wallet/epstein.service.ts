import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class EpsteinWalletService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async getEpsteinBalance(walletId: string): Promise<number> {
    try {
      const epsteinUrl = this.configService.get<string>('EPSTEIN_SERVICE_URL');
      if (!epsteinUrl) {
        throw new Error('EPSTEIN_SERVICE_URL is not configured');
      }

      const { data } = await firstValueFrom(
        this.httpService.get<{ balance: number }>(`${epsteinUrl}/wallet/${walletId}/balance`),
      );

      if (!data || typeof data.balance !== 'number') {
        throw new Error('Invalid response from Epstein service');
      }

      return data.balance;
    } catch (error) {
      throw new HttpException(
        `Failed to fetch wallet balance from Epstein service: ${error.message}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}