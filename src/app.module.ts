import { Module } from "@nestjs/common";
import { StatusModule } from "./status/status.module";
import { UsersModule } from "./users/users.module";
import { GuestModule } from "./guest/guest.module";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from './auth/auth.module';
import { RandomNicknameModule } from './random-nickname/random-nickname.module';
import { CacheModule } from './cache/cache.module';
import { RedisModule } from './redis/redis.module';
import * as dotenv from "dotenv";

dotenv.config();

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGO_URI),
    StatusModule,
    UsersModule,
    GuestModule,
    AuthModule,
    RandomNicknameModule,
    CacheModule,
    RedisModule
  ],
})
export class AppModule {
}