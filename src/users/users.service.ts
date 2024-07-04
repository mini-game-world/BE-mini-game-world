import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersRepository } from './users.repository.js';
import {
  RequestCreateCommonUserDTO,
  LoginCommonUserDTO,
  CreateCommonUserDTO,
} from './DTO/users.DTO.js';
import { User } from './schema/users.schema.js';
import { AuthService } from '../auth/auth.service.js';
import { RandomNicknameService } from '../random-nickname/random-nickname.service.js';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly authService: AuthService,
    private readonly randomNicknameService: RandomNicknameService,
  ) {}

  private logger: Logger = new Logger('Users - Service');

  async registerUser(createUserDto: RequestCreateCommonUserDTO) {
    const hashedPassword: string = await this.authService.hashPassword(
      createUserDto.password,
    );
    const randomNickname: string =
      await this.randomNicknameService.getRandomNickname();

    const createCommonUserDto: CreateCommonUserDTO =
      CreateCommonUserDTO.builder()
        .setNickname(createUserDto.nickname)
        .setRandomNickname(randomNickname)
        .setPassword(hashedPassword)
        .build();

    try {
      const user: User =
        await this.usersRepository.createCommonUser(createCommonUserDto);
      return { nickname: user.nickname, randomNickname: user.randomNickname };
    } catch (err) {
      this.logger.error(`registerUser  error massage ==> ${err.message}`);
      throw new HttpException(
        '해당 닉네임이 이미 존재합니다.',
        HttpStatus.CONFLICT,
      );
    }
  }

  async loginUser(loginUserDto: LoginCommonUserDTO) {
    const { nickname, password } = loginUserDto;
    const user = await this.usersRepository.findUserByName(nickname);

    if (
      !user ||
      !(await this.authService.validatePassword(password, user.password))
    ) {
      this.logger.error(`user info ${user}`);
      throw new UnauthorizedException('유효하지 않은 접근입니다.');
    }
    const access_token: string = await this.authService.generateJwtToken({
      nickname: user.nickname,
    });
    return { token: access_token, randomNickname: user.randomNickname };
  }
}
