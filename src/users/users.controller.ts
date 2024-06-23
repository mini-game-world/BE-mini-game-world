import { Body, Controller, HttpCode, Logger, Post, UseFilters } from "@nestjs/common";
import { UsersService } from "./users.service";
import { CreatCommonUserDTO } from "./DTO/users.creatDTO";
import { ResponseDTO } from "../common/response.DTO";
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';
@Controller("users")
export class UsersController {
  constructor(private readonly userService: UsersService) {
  }
  private logger: Logger = new Logger("Users - Controller");

  @Post("register")
  @HttpCode(201)
  @UseFilters(HttpExceptionFilter)
  async registerUser(@Body() creatUserDTO: CreatCommonUserDTO):Promise<ResponseDTO<{ nickname: string }>> {
    const userName:string = await this.userService.registerUser(creatUserDTO);

    const response = ResponseDTO.builder<{ nickname: string }>()
      .setSuccess(true)
      .setData({ nickname: userName })
      .build();

    this.logger.log( `response==> ${response}`)

    return response;
  }

}

