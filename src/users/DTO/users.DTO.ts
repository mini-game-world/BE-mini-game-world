// user.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';

export class RequestCreateCommonUserDTO {
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
  nickname: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}


export class CreateCommonUserDTO {
  @IsString()
  @IsNotEmpty()
  nickname: string;

  @IsString()
  randomNickname:string;

  @IsString()
  @IsNotEmpty()
  password: string;

  static builder() {
    return new CreateCommonUserDTOBuilder();
  }
}

class CreateCommonUserDTOBuilder {
  private readonly createCommonUserDTO: CreateCommonUserDTO;

  constructor() {
    this.createCommonUserDTO = new CreateCommonUserDTO();
  }

  setNickname(nickname: string): CreateCommonUserDTOBuilder {
    this.createCommonUserDTO.nickname = nickname;
    return this;
  }

  setRandomNickname(randomNickname: string): CreateCommonUserDTOBuilder {
    this.createCommonUserDTO.randomNickname = randomNickname;
    return this;
  }

  setPassword(password: string): CreateCommonUserDTOBuilder {
    this.createCommonUserDTO.password = password;
    return this;
  }

  build(): CreateCommonUserDTO {
    return this.createCommonUserDTO;
  }

}
