import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { UsersService } from './users.service'
import { CreatCommonUserDTO } from './DTO/users.creatDTO'

@Controller('users')
export class UsersController {
  constructor(private readonly userService:UsersService) {
  }

  @Post('register')
  @HttpCode(201)
  registerUser(@Body() creatUserDTO:CreatCommonUserDTO){
     const userName =  this.userService.registerUser(creatUserDTO)
    return { "success":true , "nickname":userName}
  }

}

