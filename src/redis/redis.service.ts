import { Injectable } from '@nestjs/common';
import * as dotenv from 'dotenv';
import * as Redis from 'ioredis';

dotenv.config();

@Injectable()
export class RedisService {
  private readonly client: Redis.Redis; // Explicitly type the client property
  constructor() {
    this.client = new Redis.default({
      host: 'localhost', // Redis 서버 호스트
      port: 6379, // Redis 서버 포트
      // password: 'yourpassword', // 비밀번호가 없는 경우 이 줄을 생략
    });
  }

  getClient(): Redis.Redis {
    return this.client;
  }
}
