// user.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';

export class CreatCommonUserDTO {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}