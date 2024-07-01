import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ChattingRepository } from './chatting.repository';
import { AhoCorasick } from './utils/aho-corasick';

@Injectable()
export class ChattingService implements OnModuleInit {
  private ac: AhoCorasick;
  private readonly logger: Logger = new Logger('Chatting - Service');

  constructor(private readonly chattingRepository: ChattingRepository) {}

  async onModuleInit() {
    const keywords = await this.chattingRepository.settingBadWord();
    this.ac = new AhoCorasick();
    this.ac.build(keywords);
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
}
