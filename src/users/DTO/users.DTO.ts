// user.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';

export class CreatCommonUserDTO {
  @IsString()
  @IsNotEmpty()
  nickname: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class LoginCommonUserDTO {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}