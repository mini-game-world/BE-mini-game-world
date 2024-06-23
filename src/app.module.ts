import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { StatusModule } from "./status/status.module";
import { statusGateway } from "./status/status.gateway";
import { StatusBombGameService } from "./status/status.service";
import { UsersModule } from "./users/users.module";
import { GuestModule } from "./guest/guest.module";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from './auth/auth.module';
import { RandomNicknameModule } from './random-nickname/random-nickname.module';
import * as dotenv from "dotenv";

dotenv.config();

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGO_URI),
    StatusModule,
    EventEmitterModule.forRoot(),
    UsersModule,
    GuestModule,
    AuthModule,
    RandomNicknameModule
  ],
  providers: [statusGateway, StatusBombGameService]
})
export class AppModule {
}