import { Body, Controller, HttpCode, Logger, Post, UseFilters, UsePipes } from "@nestjs/common";
import { UsersService } from "./users.service";
import { CreatCommonUserDTO, LoginCommonUserDTO } from "./DTO/users.DTO";
import { ResponseDTO } from "../common/response.DTO";
import { HttpExceptionFilter } from "../common/filters/http-exception.filter";
import { CustomValidationPipe } from '../common/pipes/custom-validation.pipe'


@Controller("users")
export class UsersController {
  constructor(private readonly userService: UsersService) {
  }

  private logger: Logger = new Logger("Users - Controller");

  @Post("register")
  @HttpCode(201)
  @UseFilters(HttpExceptionFilter)
  @UsePipes(new CustomValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async registerUser(@Body() creatUserDTO: CreatCommonUserDTO): Promise<ResponseDTO<{ nickname: string }>> {
    const userName: string = await this.userService.registerUser(creatUserDTO);

    return ResponseDTO.builder<{ nickname: string }>()
      .setSuccess(true)
      .setData({ nickname: userName })
      .build();
  }

  @Post('login')
  @HttpCode(200)
  @UsePipes(new CustomValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async login(@Body() loginUserDto: LoginCommonUserDTO): Promise<ResponseDTO<{ access_token: string }>> {
    const token = await this.userService.loginUser(loginUserDto);

    return ResponseDTO.builder<{ access_token: string }>()
      .setSuccess(true)
      .setData({ access_token: token.access_token })
      .build();
  }

}

