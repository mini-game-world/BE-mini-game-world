// src/geckos-io/geckos-io.service.ts
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class GeckosIoService {
  private readonly logger = new Logger('GeckosIoService');
  public io: any;
  private initialized = false;
  private initializationPromise: Promise<void>;

  async initialize() {
    if (this.initialized) {
      return;
    }

    this.initializationPromise = new Promise(async (resolve) => {
      const customIceServers = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ];

      const geckosModule = await import('@geckos.io/server');
      const geckos = geckosModule.default;

      this.io = geckos({ iceServers: customIceServers });
      this.io.listen(3001, { host: '0.0.0.0' });
      this.logger.log('Geckos.io server initialized');
      this.initialized = true;
      resolve();
    });

    return this.initializationPromise;
  }

  async waitForInitialization() {
    if (!this.initializationPromise) {
      await this.initialize();
    }
    await this.initializationPromise;
  }
}
