import { Injectable } from '@nestjs/common';
import { ISuperAppAdapter, SuperAppConfig, SuperAppUser } from './super-app.interface';

@Injectable()
export class SuperAppAdapter implements ISuperAppAdapter {
  readonly provider: string;
  private config: SuperAppConfig;

  constructor(config: SuperAppConfig) {
    this.config = config;
    this.provider = config.name;
  }

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      state,
    });
    return `${this.config.authorizationUrl}?${params.toString()}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<string> {
    const response = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }),
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed for ${this.provider}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.access_token;
  }

  async getUserInfo(accessToken: string): Promise<SuperAppUser> {
    const response = await fetch(this.config.userInfoUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`User info fetch failed for ${this.provider}: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      id: data.sub || data.id,
      email: data.email,
      phone_number: data.phone_number,
      full_name: data.name,
      avatar_url: data.picture,
    };
  }
}
