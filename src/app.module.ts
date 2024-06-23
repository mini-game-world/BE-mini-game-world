import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { StatusModule } from "./status/status.module";
import { statusGateway } from "./status/status.gateway";
import { StatusBombGameService } from "./status/status.service";
import { UsersModule } from "./users/users.module";
import { GuestModule } from "./guest/guest.module";
import { MongooseModule } from "@nestjs/mongoose";
import { JwtModule } from '@nestjs/jwt';
import * as dotenv from "dotenv";

dotenv.config();

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGO_URI),
    JwtModule.register({secret:process.env.JWT_SECRET, signOptions:{expiresIn:process.env.JWT_EXPIRE_TIME}}),
    StatusModule,
    EventEmitterModule.forRoot(),
    UsersModule,
    GuestModule
  ],
  providers: [statusGateway, StatusBombGameService]
})
export class AppModule {
}