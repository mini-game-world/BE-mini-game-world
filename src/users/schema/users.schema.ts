import { Prop, Schema, SchemaFactory, SchemaOptions } from "@nestjs/mongoose";
import { IsNotEmpty, IsString } from "class-validator";
import { Document } from "mongoose";

const options: SchemaOptions = {
  timestamps: true,
  id: false
};

@Schema(options)
export class User extends Document {

  @Prop({ required: true, unique: true })
  @IsString()
  @IsNotEmpty()
  nickname: string;

  @Prop()
  @IsString()
  randomNicname:string;

  @Prop({ required: true })
  @IsString()
  @IsNotEmpty()
  password: string;

  @Prop({ type: Map, of: String })
  oauthIds: {
    google: string;
    kakao: string;
    naver: string;
  };

  @Prop({ type: String, enum: ['active', 'inactive', 'banned'], default: 'active' })
  @IsString()
  @IsNotEmpty()
  status: string;
}

export const UserSchema = SchemaFactory.createForClass(User);


