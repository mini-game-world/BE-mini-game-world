import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { User } from "./schema/users.schema";
import { Injectable } from "@nestjs/common";
import { CreatCommonUserDTO } from "./DTO/users.creatDTO";


@Injectable()
export class UsersRepository {
  constructor(@InjectModel(User.name) private readonly userModel: Model<User>) {
  }

  async createCommonUser(createUserDto: CreatCommonUserDTO): Promise<User> {
    const newUser = new this.userModel(createUserDto);
    return await newUser.save();
  }
}