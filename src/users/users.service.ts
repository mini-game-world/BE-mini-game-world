import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { UsersRepository } from "./users.repository";
import { CreatCommonUserDTO } from "./DTO/users.creatDTO";
import { User } from "./schema/users.schema";

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {
  }

  private logger: Logger = new Logger("Users - Service");

  async registerUser(createUserDto: CreatCommonUserDTO) {
    try {
      const user:User = await this.usersRepository.createCommonUser(createUserDto);
      return user.nickname;
    } catch (err) {
      this.logger.error(`registerUser  error massage ==> ${err.message}`);
      throw new HttpException("해당 닉네임이 이미 존재합니다.", HttpStatus.CONFLICT);
    }
  }

}



