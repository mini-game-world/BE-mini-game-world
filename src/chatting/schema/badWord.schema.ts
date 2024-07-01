import { Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { IsOptional, IsString } from 'class-validator';


@Schema({ collection: 'badWords' })
export class BadWord extends Document{

  @IsOptional()
  @IsString()
  word: string;
}

export const BadWordSchema = SchemaFactory.createForClass(BadWord);