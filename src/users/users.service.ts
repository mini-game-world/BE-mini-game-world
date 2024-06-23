import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { CreatCommonUserDTO } from "./DTO/users.creatDTO";

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {
  }
  private logger: Logger = new Logger("Users - Service");

  async registerUser(createUserDto: CreatCommonUserDTO) {
    try {
      const user = await this.usersRepository.createCommonUser(createUserDto);
      return user.name;
    } catch (err) {
      this.logger.error(`registerUser  error massage ==> ${err.message}`);

      throw new HttpException('해당 닉네임이 이미 존재합니다.', HttpStatus.CONFLICT);
    }
  }

}



