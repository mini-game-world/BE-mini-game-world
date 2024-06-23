import { HttpException, HttpStatus, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { UsersRepository } from "./users.repository";
import { CreatCommonUserDTO, LoginCommonUserDTO } from "./DTO/users.DTO";
import { User } from "./schema/users.schema";
import { AuthService } from "../auth/auth.service";

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly authService: AuthService) {
  }

  private logger: Logger = new Logger("Users - Service");

  async registerUser(createUserDto: CreatCommonUserDTO) {
    const hashedPassword = await this.authService.hashPassword(createUserDto.password);

    try {
      const user: User = await this.usersRepository.createCommonUser({...createUserDto, password: hashedPassword,});
      return user.nickname;
    } catch (err) {
      this.logger.error(`registerUser  error massage ==> ${err.message}`);
      throw new HttpException("해당 닉네임이 이미 존재합니다.", HttpStatus.CONFLICT);
    }
  }


  async loginUser(loginUserDto: LoginCommonUserDTO): Promise<{ access_token: string }> {
    const { username, password } = loginUserDto;
    const user = await this.usersRepository.findUserByName(username);

    if (!user || !(await this.authService.validatePassword(password, user.password))) {
      throw new UnauthorizedException("유효하지 않은 접근입니다.");
    }
    const access_token = await this.authService.generateJwtToken(user.nickname);
    return { access_token };
  }

}



