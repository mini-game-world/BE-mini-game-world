import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service.js';

@Injectable()
export class CacheService {
  // constructor(private readonly redisService: RedisService) {}

  // async set(key: string, value: string) {
  //   const client = this.redisService.getClient();
  //   await client.set(key, value);
  // }

  // async get(key: string): Promise<string | null> {
  //   const client = this.redisService.getClient();
  //   return await client.get(key);
  // }

  // async del(key: string): Promise<void> {
  //   const client = this.redisService.getClient();
  //   await client.del(key);
  // }
}
