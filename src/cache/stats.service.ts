import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PlayerStats } from './schemas/player-stats.schema.js';

@Injectable()
export class StatsService {
  constructor(
    @InjectModel(PlayerStats.name) private readonly playerStatsModel: Model<PlayerStats>,
  ) {}

  async saveTopPlayersToDB(topBombsPlayer, topHitsPlayer): Promise<void> {
    const currentStats = await this.playerStatsModel.findOne() || new this.playerStatsModel();

    let updated = false;

    if (topBombsPlayer && topBombsPlayer.count > currentStats.bombCount) {
      currentStats.bombCount = topBombsPlayer.count;
      updated = true;
    }

    if (topHitsPlayer && topHitsPlayer.count > currentStats.hitCount) {
      currentStats.hitCount = topHitsPlayer.count;
      updated = true;
    }

    if (updated) await currentStats.save();
  }
}
