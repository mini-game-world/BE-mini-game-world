import { Injectable } from '@nestjs/common';
import * as dotenv from 'dotenv';
const Redis = require('ioredis');

dotenv.config();

@Injectable()
export class RedisService {
  private readonly client: any; // 타입을 any로 임시 변경
  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
    });
  }

  getClient(): any {
    return this.client;
  }
}
