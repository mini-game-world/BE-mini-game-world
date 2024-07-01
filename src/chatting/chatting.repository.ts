import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { BadWord } from "./schema/badWord.schema";
import { Injectable } from "@nestjs/common";

@Injectable()
export class ChattingRepository {
  constructor(@InjectModel(BadWord.name) private readonly badWordModel: Model<BadWord>){}

  async settingBadWord(){
    return this.badWordModel.find().exec();
  }
}