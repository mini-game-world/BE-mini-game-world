import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service.js';

@Injectable()
export class CacheService {
  constructor(private readonly redisService: RedisService) {
    this.client = this.redisService.getClient();
  }

  private readonly BOMB_RANKINGS:string = 'bombRankings'
  private readonly HIT_RANKINGS:string = 'hitRankings'
  private client;

  /**
   * Redis - string
   */
  // async set(key: string, value: string) {
  //   await this.client.set(key, value);
  // }

  /**
   * Redis - string
   */
  // async get(key: string): Promise<string | null> {
  //   return await this.client.get(key);
  // }

  /**
   * Redis - string
   */
  // async increment(key: string): Promise<number> {
  //   return await this.client.incr(key);
  // }

  /**
   * Redis - sorted-set
   */
  async incrementBombCount(player: string): Promise<number> {
    const newCount = await this.client.zincrby(this.BOMB_RANKINGS, 1, player);
    return parseInt(newCount, 10)
  }

  /**
   * Redis - sorted-set
   */
  async incrementHitCount(player: string): Promise<number> {
    const newCount = await this.client.zincrby(this.HIT_RANKINGS, 1, player);
    return parseInt(newCount, 10)
  }


  /**
   * Redis - 공용인듯 ?
   */
  async del(key: string): Promise<void> {
    await this.client.del(key);
  }


  /**
   *  레디스 데이터를 전부 날리는거니 사용주의
   */
  async flushAll(): Promise<void> {
    await this.client.flushall();
  }




  async getTopPlayerByBombs(): Promise<{ playerId: string, count: number } | null> {
    const keys = await this.client.keys('*:bomb');
    let topPlayer = null;
    let maxCount = -1;

    for (const key of keys) {
      const count = await this.client.get(key);
      if (count && parseInt(count, 10) > maxCount) {
        maxCount = parseInt(count, 10);
        topPlayer = key.split(':')[0];
      }
    }

    return topPlayer && maxCount > 0 ? { playerId: topPlayer, count: maxCount } : null;
  }

  async getTopPlayerByHits(): Promise<{ playerId: string, count: number } | null> {
    const keys = await this.client.keys('*:hit');
    let topPlayer = null;
    let maxCount = -1;

    for (const key of keys) {
      const count = await this.client.get(key);
      if (count && parseInt(count, 10) > maxCount) {
        maxCount = parseInt(count, 10);
        topPlayer = key.split(':')[0];
      }
    }

    return topPlayer && maxCount > 0 ? { playerId: topPlayer, count: maxCount } : null;
  }

  // async getBombCount(player: string): Promise<number> {
  //   const count = await this.get(`${player}:bomb`);
  //   return count ? parseInt(count, 10) : 0;
  // }
  //
  // async getHitCount(player: string): Promise<number> {
  //   const count = await this.get(`${player}:hit`);
  //   return count ? parseInt(count, 10) : 0;
  // }

  // async incrementBombCount(player: string): Promise<number> {
  //   return await this.increment(`${player}:bomb`);
  // }

  // async incrementHitCount(player: string): Promise<number> {
  //   return await this.increment(`${player}:hit`);
  // }
}
