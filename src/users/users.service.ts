import { Injectable } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { CreatCommonUserDTO } from "./DTO/users.creatDTO";

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async registerUser(createUserDto: CreatCommonUserDTO) {
    return this.usersRepository.createCommonUser(createUserDto);
  }

}



