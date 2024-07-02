import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { ChattingRepository } from './chatting.repository';
import { AhoCorasick } from './utils/aho-corasick';

@Injectable()
export class ChattingService implements OnModuleInit {
  constructor(
    private readonly chattingRepository: ChattingRepository,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  private ac: AhoCorasick;
  private updateScheduled: boolean = true;
  private readonly logger: Logger = new Logger('Chatting - Service');

  async onModuleInit() {
    try {
      await this.initializeAhoCorasick();
    } catch (error) {
      this.logger.error('Error during initialization', error);
    }
  }

  async censorBadWords(text: string): Promise<string> {
    const badWordsFound = this.search(text);
    if (badWordsFound.length === 0) {
      return text;
    }

    this.logger.warn(
      `Bad words found in message: ${badWordsFound.map(({ keyword }) => keyword).join(', ')}`,
    );

    let censoredText = text;
    const offsets = Array(text.length).fill(0); // To track adjustments in indices

    badWordsFound.forEach(({ start, end }) => {
      const badWordLength = end - start + 1;
      const adjustedStart =
        start + offsets.slice(0, start).reduce((a, b) => a + b, 0);
      const adjustedEnd =
        end + offsets.slice(0, end + 1).reduce((a, b) => a + b, 0);

      censoredText =
        censoredText.slice(0, adjustedStart) +
        '*'.repeat(badWordLength) +
        censoredText.slice(adjustedEnd + 1);

      const adjustment =
        '*'.repeat(badWordLength).length - (adjustedEnd - adjustedStart + 1);
      for (let i = start; i <= end; i++) {
        offsets[i] += adjustment;
      }
    });
    return censoredText;
  }

  scheduleForbiddenWordUpdate() {
    if (this.updateScheduled) {
      const job = new CronJob('0 3 * * *', async () => {
        await this.initializeAhoCorasick();
        this.updateScheduled = true; // 업데이트 후 플래그 리셋
        this.logger.log('Forbidden words updated at 3 AM');
      });

      this.schedulerRegistry.addCronJob('updateForbiddenWords', job);
      job.start();
      this.updateScheduled = false; // 업데이트 스케줄링 플래그 설정
      this.logger.log('Forbidden words update scheduled at 3 AM');
    }
  }

  private search(
    text: string,
  ): { start: number; end: number; keyword: string }[] {
    const matches = this.ac.search(text);

    return matches.map((match) => {
      const { pattern, index } = match;
      const start = index;
      const end = start + pattern.length - 1;
      return { start, end, keyword: pattern };
    });
  }

  private async initializeAhoCorasick() {
    try {
      const keywords = await this.chattingRepository.settingBadWord();
      this.ac = new AhoCorasick();
      this.ac.build(keywords);
    } catch (error) {
      this.logger.error('Error initializing AhoCorasick', error);
    }
  }
}
