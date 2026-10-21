import { Injectable } from '@nestjs/common';
import { auth } from './better-auth.config';

@Injectable()
export class BetterAuthService {
  private authInstance = auth;

  getAuth() {
    return this.authInstance;
  }

  async signIn(email: string, password: string) {
    return this.authInstance.api.signInEmail({
      body: { email, password },
    });
  }

  async signUp(email: string, password: string, name: string) {
    return this.authInstance.api.signUpEmail({
      body: { email, password, name },
    });
  }

  async signOut(sessionToken: string) {
    return this.authInstance.api.signOut({
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
    });
  }

  async getSession(sessionToken: string) {
    return this.authInstance.api.getSession({
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
    });
  }
}