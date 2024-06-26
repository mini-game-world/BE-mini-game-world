import {
  Body,
  Controller,
  HttpCode,
  Logger,
  Post,
  UseFilters,
  UsePipes,
} from '@nestjs/common';
import { UsersService } from './users.service.js';
import {
  RequestCreateCommonUserDTO,
  LoginCommonUserDTO,
} from './DTO/users.DTO.js';
import { ResponseDTO } from '../common/response.DTO.js';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter.js';
import { CustomValidationPipe } from '../common/pipes/custom-validation.pipe.js';

@Controller('users')
export class UsersController {
  constructor(private readonly userService: UsersService) {}

  private logger: Logger = new Logger('Users - Controller');

  @Post('register')
  @HttpCode(201)
  @UseFilters(HttpExceptionFilter)
  @UsePipes(
    new CustomValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async registerUser(@Body() creatUserDTO: RequestCreateCommonUserDTO) {
    const user = await this.userService.registerUser(creatUserDTO);

    return ResponseDTO.builder<{ nickname: string; randomNickname: string }>()
      .setSuccess(true)
      .setData(user)
      .build();
  }

  @Post('login')
  @HttpCode(200)
  @UseFilters(HttpExceptionFilter)
  @UsePipes(
    new CustomValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async login(@Body() loginUserDto: LoginCommonUserDTO) {
    const data = await this.userService.loginUser(loginUserDto);

    return ResponseDTO.builder<{ token: string; randomNickname: string }>()
      .setSuccess(true)
      .setData(data)
      .build();
  }
}
