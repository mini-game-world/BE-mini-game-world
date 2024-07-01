import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ChattingRepository } from './chatting.repository';
import AhoCorasick from 'ahocorasick';

@Injectable()
export class ChattingService implements OnModuleInit {
  private ac: any;
  private readonly logger: Logger = new Logger('Chatting - Service');

  constructor(private readonly chattingRepository: ChattingRepository) {}

  async onModuleInit() {
    const badWords = await this.chattingRepository.settingBadWord();
    const keywords = badWords.map(word => word.word);
    this.ac = new AhoCorasick(keywords);
  }

  async censorBadWords(text: string): Promise<string> {
    const badWordsFound = this.search(text);
    if (badWordsFound.length === 0) {
      return text;
    }

    this.logger.warn(`Bad words found in message: ${badWordsFound.map(({ keyword }) => keyword).join(', ')}`);

    let censoredText = text;
    badWordsFound.reverse().forEach(({ start, end }) => {
      const badWordLength = end - start + 1;
      censoredText = censoredText.slice(0, start) + '*'.repeat(badWordLength) + censoredText.slice(end + 1);
    });

    return censoredText;
  }

  private search(text: string) {
    const matches = this.ac.search(text);
    return matches.map((match: any) => {
      const [keyword, index] = match;
      const start = index;
      const end = start + keyword.length - 1;
      return { start, end, keyword };
    });
  }
}
