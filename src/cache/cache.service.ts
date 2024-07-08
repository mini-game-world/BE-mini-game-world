import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service.js';

@Injectable()
export class CacheService {
  constructor(private readonly redisService: RedisService) {}

  /**
   * Redis - string
   */
  // async set(key: string, value: string) {
  //   const client = this.redisService.getClient();
  //   await client.set(key, value);
  // }

  /**
   * Redis - string
   */
  // async get(key: string): Promise<string | null> {
  //   const client = this.redisService.getClient();
  //   return await client.get(key);
  // }

  /**
   * Redis - string
   */
  // async increment(key: string): Promise<number> {
  //   const client = this.redisService.getClient();
  //   return await client.incr(key);
  // }

  /**
   * Redis - 공용인듯 ?
   */
  async del(key: string): Promise<void> {
    const client = this.redisService.getClient();
    await client.del(key);
  }


  /**
   *  레디스 데이터를 전부 날리는거니 사용주의
   */
  async flushAll(): Promise<void> {
    const client = this.redisService.getClient();
    await client.flushall();
  }


  async getBombCount(player: string): Promise<number> {
    const count = await this.get(`${player}:bomb`);
    return count ? parseInt(count, 10) : 0;
  }

  async getHitCount(player: string): Promise<number> {
    const count = await this.get(`${player}:hit`);
    return count ? parseInt(count, 10) : 0;
  }

  async getTopPlayerByBombs(): Promise<{ playerId: string, count: number } | null> {
    const client = this.redisService.getClient();
    const keys = await client.keys('*:bomb');
    let topPlayer = null;
    let maxCount = -1;

    for (const key of keys) {
      const count = await client.get(key);
      if (count && parseInt(count, 10) > maxCount) {
        maxCount = parseInt(count, 10);
        topPlayer = key.split(':')[0];
      }
    }

    return topPlayer && maxCount > 0 ? { playerId: topPlayer, count: maxCount } : null;
  }

  async getTopPlayerByHits(): Promise<{ playerId: string, count: number } | null> {
    const client = this.redisService.getClient();
    const keys = await client.keys('*:hit');
    let topPlayer = null;
    let maxCount = -1;

    for (const key of keys) {
      const count = await client.get(key);
      if (count && parseInt(count, 10) > maxCount) {
        maxCount = parseInt(count, 10);
        topPlayer = key.split(':')[0];
      }
    }

    return topPlayer && maxCount > 0 ? { playerId: topPlayer, count: maxCount } : null;
  }

  // async incrementBombCount(player: string): Promise<number> {
  //   return await this.increment(`${player}:bomb`);
  // }

  // async incrementHitCount(player: string): Promise<number> {
  //   return await this.increment(`${player}:hit`);
  // }
}
