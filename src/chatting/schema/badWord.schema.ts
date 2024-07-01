import { Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { IsOptional } from 'class-validator';


@Schema({ collection: 'badWords' })
export class BadWord extends Document{
  @IsOptional()
  word: string;
}

export const BadWordSchema = SchemaFactory.createForClass(BadWord);