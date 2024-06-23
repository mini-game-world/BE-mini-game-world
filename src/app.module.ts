import { Module } from '@nestjs/common';
import { StatusModule } from './status/status.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { GuestModule } from './guest/guest.module';
import { MongooseModule } from '@nestjs/mongoose';
import * as dotenv from 'dotenv';

dotenv.config();
@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGO_URI),
    StatusModule,
    AuthModule,
    UsersModule,
    GuestModule
  ]
})
export class AppModule {}