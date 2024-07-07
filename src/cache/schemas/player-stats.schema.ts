import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class PlayerStats extends Document {
  @Prop({ default: 0 })
  bombCount: number;

  @Prop({ default: 0 })
  hitCount: number;
}

export const PlayerStatsSchema = SchemaFactory.createForClass(PlayerStats);