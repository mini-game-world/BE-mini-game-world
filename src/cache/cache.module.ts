import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheService } from './cache.service.js';
import { RedisModule } from '../redis/redis.module.js';
import { PlayerStats, PlayerStatsSchema } from './schemas/player-stats.schema.js';
import { StatsService } from './stats.service.js';

@Module({
  imports: [
    RedisModule,
    MongooseModule.forFeature([{ name: PlayerStats.name, schema: PlayerStatsSchema }]),
  ],
  providers: [CacheService, StatsService],
  exports: [CacheService, StatsService],
})
export class CacheModule {}