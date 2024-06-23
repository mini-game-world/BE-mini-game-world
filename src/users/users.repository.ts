import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { User } from "./schema/users.schema";
import { Injectable } from "@nestjs/common";
import { CreateCommonUserDTO } from "./DTO/users.DTO";


@Injectable()
export class UsersRepository {
  constructor(@InjectModel(User.name) private readonly userModel: Model<User>) {
  }

  async createCommonUser(createUserDto: CreateCommonUserDTO): Promise<User> {
    const newUser = new this.userModel(createUserDto);
    return await newUser.save();
  }

  async findUserByName(nickname: string) {
    return await this.userModel.findOne({ nickname }).exec();
  }

}