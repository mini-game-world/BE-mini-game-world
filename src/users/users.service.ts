import { Injectable } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { CreatCommonUserDTO } from "./DTO/users.creatDTO";

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {
  }

  async registerUser(createUserDto: CreatCommonUserDTO) {
    try {
      const user = await this.usersRepository.createCommonUser(createUserDto);
      return user.name;
    } catch (err) {
      throw new Error(err.message)
    }
  }

}



