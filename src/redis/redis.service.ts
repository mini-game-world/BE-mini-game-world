import { Injectable } from '@nestjs/common';
import * as Redis from 'ioredis';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class RedisService {
  private readonly client: Redis.default;  // 타입을 명확히 지정

  constructor() {
    // this.client = new Redis.default({
    //   host: process.env.REDIS_HOST,
    //   port: 6379,
    // });
  }

  getClient(): Redis.default {
    return this.client;
  }
}
