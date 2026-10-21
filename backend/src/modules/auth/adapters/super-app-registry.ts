import { Injectable } from '@nestjs/common';
import { ISuperAppAdapter } from './super-app.interface';

@Injectable()
export class SuperAppRegistry {
  private adapters: Map<string, ISuperAppAdapter> = new Map();

  register(adapter: ISuperAppAdapter): void {
    if (this.adapters.has(adapter.provider)) {
      throw new Error(`Adapter for provider '${adapter.provider}' is already registered`);
    }
    this.adapters.set(adapter.provider, adapter);
  }

  get(provider: string): ISuperAppAdapter {
    const adapter = this.adapters.get(provider);
    if (!adapter) {
      throw new Error(`No adapter registered for provider '${provider}'`);
    }
    return adapter;
  }

  getAllProviders(): string[] {
    return Array.from(this.adapters.keys());
  }
}
