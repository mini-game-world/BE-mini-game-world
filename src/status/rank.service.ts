import { Injectable, Logger } from '@nestjs/common';
import { PriorityQueue } from './Utils/utils.PriorityQueue';

interface PlayerStats {
  hits: number;
  bombs: number;
}

@Injectable()
export class RankService {
  constructor() {
    this.hitsQueue = new PriorityQueue<{ playerId: string; count: number }>(
      (a, b) => b.count - a.count,
    );
    this.bombsQueue = new PriorityQueue<{ playerId: string; count: number }>(
      (a, b) => b.count - a.count,
    );
  }
  private logger: Logger = new Logger('RankService');
  private playerStats: { [key: string]: PlayerStats } = {};
  private hitsQueue: PriorityQueue<{ playerId: string; count: number }>;
  private bombsQueue: PriorityQueue<{ playerId: string; count: number }>;

  private readonly HIT: string = 'hit';
  private readonly BOMB: string = 'bomb';

  processEvent(data: { playerId: string; eventType: string }): void {
    const { playerId, eventType } = data;

    if (!this.playerStats[playerId]) {
      this.playerStats[playerId] = { hits: 0, bombs: 0 };
      this.hitsQueue.push({ playerId, count: 0 });
      this.bombsQueue.push({ playerId, count: 0 });
    }
    this.updatePlayerStats(playerId, eventType);
  }

  getMVP(eventType: string): { playerId: string; count: number } {
    if (eventType === this.HIT) {
      const top = this.hitsQueue.peek();
      this.logger.log(`getMVP  많이 맞은 플레이어 : ${JSON.stringify(top)}`);
      return top;
    } else if (eventType === this.BOMB) {
      const top = this.bombsQueue.peek();
      this.logger.log(`getMVP  많이 폭탄 옮긴 플레이어 : ${JSON.stringify(top)}`,);
      return top;
    }
    return null;
  }

  endGame() {
    this.hitsQueue.clear();
    this.bombsQueue.clear();
  }

  private updateQueue(
    queue: PriorityQueue<{ playerId: string; count: number }>,
    playerId: string,
    count: number,
  ): void {
    queue.update({ playerId, count }, count, (item) => item.playerId);
  }

  private updatePlayerStats(playerId: string, eventType: string): void {
    switch (eventType) {
      case this.HIT:
        this.playerStats[playerId].hits += 1;
        this.updateQueue(
          this.hitsQueue,
          playerId,
          this.playerStats[playerId].hits,
        );
        break;
      case this.BOMB:
        this.playerStats[playerId].bombs += 1;
        this.updateQueue(
          this.bombsQueue,
          playerId,
          this.playerStats[playerId].bombs,
        );
        break;
      default:
        break;
    }
  }
}
