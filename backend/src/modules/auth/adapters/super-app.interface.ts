export interface SuperAppUser {
  id: string;
  email?: string;
  phone_number?: string;
  full_name?: string;
  avatar_url?: string;
}

export interface SuperAppConfig {
  name: string;
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scopes: string[];
  redirectUri: string;
}

export interface ISuperAppAdapter {
  readonly provider: string;
  getAuthorizationUrl(state: string): string;
  exchangeCode(code: string, redirectUri: string): Promise<string>;
  getUserInfo(accessToken: string): Promise<SuperAppUser>;
}
