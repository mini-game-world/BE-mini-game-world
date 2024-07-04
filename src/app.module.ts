import { Module } from '@nestjs/common';
import { StatusModule } from './status/status.module.js';
import { UsersModule } from './users/users.module.js';
import { GuestModule } from './guest/guest.module.js';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module.js';
import { RandomNicknameModule } from './random-nickname/random-nickname.module.js';
import { CacheModule } from './cache/cache.module.js';
import { RedisModule } from './redis/redis.module.js';
import { ChattingModule } from './chatting/chatting.module.js';
import { GeckosIoModule } from './geckos/geckos.module.js';

import * as dotenv from 'dotenv';

dotenv.config();

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGO_URI),
    PrometheusModule.register(),
    StatusModule,
    UsersModule,
    GuestModule,
    AuthModule,
    RandomNicknameModule,
    CacheModule,
    RedisModule,
    ChattingModule,
    GeckosIoModule,
  ],
  providers: [
    makeCounterProvider({
      name: 'websocket_connections_total',
      help: 'Total number of websocket connections',
    }),
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SocketMetricsMiddleware).forRoutes('*'); // 모든 경로에 대해 미들웨어를 적용합니다.
  }
}
