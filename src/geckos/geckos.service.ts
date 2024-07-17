// src/geckos-io/geckos-io.service.ts
import { Injectable, Logger } from '@nestjs/common';
import * as dotenv from 'dotenv';

dotenv.config();

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

      this.io = geckos({
        iceServers: customIceServers,
        cors: {
          origin: 'https://mini-game-world.com',
          allowAuthorization: true // 클라이언트와 서버가 다른 도메인에 있는 경우 필요
        }
      });
      this.io.listen(process.env.UDP_PORT, { host: '0.0.0.0' });
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
