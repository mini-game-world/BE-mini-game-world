import { Module } from '@nestjs/common';
import { StatusModule } from './status/status.module.js';
import { UsersModule } from './users/users.module.js';
import { GuestModule } from './guest/guest.module.js';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module.js';
import { RandomNicknameModule } from './random-nickname/random-nickname.module.js';
import { CacheModule } from './cache/cache.module.js';
import { RedisModule } from './redis/redis.module.js';
import { GeckosModule } from './geckos/geckos.module.js';
import * as dotenv from 'dotenv';

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
    RedisModule,
    GeckosModule,
  ],
})
export class AppModule {}
