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
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT), // Ensure the port is a number
    });
  }

  getClient(): Redis.Redis {
    return this.client;
  }
}
