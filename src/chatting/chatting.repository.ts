import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BadWord } from './schema/badWord.schema';

@Injectable()
export class ChattingRepository {
  constructor(@InjectModel(BadWord.name) private readonly badWordModel: Model<BadWord>) {}

  async settingBadWord(): Promise<string[]> {
    // lean() 메서드를 사용하여 일반 JavaScript 객체로 반환 .. ?!
    const badWords = await this.badWordModel.find().select('word -_id').lean().exec();
    return badWords.map(badWord => {
      return badWord.word;
    });
  }
}
