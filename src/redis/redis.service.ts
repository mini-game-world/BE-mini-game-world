import { Injectable } from '@nestjs/common';
import * as dotenv from 'dotenv';
import * as Redis from 'ioredis';

dotenv.config();

@Injectable()
export class RedisService {
  private readonly client: Redis.Redis; // Explicitly type the client property
  constructor() {
    this.client = new Redis.default({
      // REDIS_HOST=127.0.0.1
      // REDIS_PORT=6379
      host: '127.0.0.1',
      port: Number(6379), // Ensure the port is a number
    });
  }

  getClient(): Redis.Redis {
    return this.client;
  }
}
