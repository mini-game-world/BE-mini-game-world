import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ChattingRepository } from './chatting.repository';
import { AhoCorasick } from 'aho-corasick';

@Injectable()
export class ChattingService implements OnModuleInit{
  private ac: AhoCorasick;
  constructor(
    private readonly chattingRepository: ChattingRepository
  ){}
  private logger: Logger = new Logger("Chatting - Service");

  async onModuleInit() {
    const badWords = await this.chattingRepository.settingBadWord();
    const keywords = badWords.map(word => word.word);
    this.ac = new AhoCorasick(keywords);
  }

  search(text: string) {
    return this.ac.search(text);
  }

}