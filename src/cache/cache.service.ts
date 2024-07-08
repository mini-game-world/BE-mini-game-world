import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service.js';
import * as Redis from 'ioredis';
@Injectable()
export class CacheService {
  private client:Redis.Redis;
  readonly BOMB_RANKINGS:string = 'bombRankings'
  readonly HIT_RANKINGS:string = 'hitRankings'

  constructor(private readonly redisService: RedisService) {
    this.client = this.redisService.getClient();
  }

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
  async incrementHitCount(player: string): Promise<number> {
    const newCount = await this.client.zincrby(this.HIT_RANKINGS, 1, player);
    return parseInt(newCount, 10)
  }

  async getTopPlayerByBombs(): Promise<{ playerId: string, count: number } | null> {
    const topPlayer = await this.client.zrevrange(this.BOMB_RANKINGS, 0, 0, 'WITHSCORES');
    if (topPlayer.length === 0) return null;
    return { playerId: topPlayer[0], count: parseInt(topPlayer[1], 10) };
  }

  async getTopPlayerByHits(): Promise<{ playerId: string, count: number } | null> {
    const topPlayer = await this.client.zrevrange(this.HIT_RANKINGS, 0, 0, 'WITHSCORES');
    if (topPlayer.length === 0) return null;
    return { playerId: topPlayer[0], count: parseInt(topPlayer[1], 10) };
  }

  async delGameRankingInfo(): Promise<void> {
    await this.client.del(this.BOMB_RANKINGS);
    await this.client.del(this.HIT_RANKINGS);
  }


  /**
   *  레디스 데이터를 전부 날리는거니 사용주의
   */
  // async flushAll(): Promise<void> {
  //   await this.client.flushall();
  // }

}
