import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { StatusModule } from './status/status.module';
import { statusGateway } from './status/status.gateway'
import { StatusBombGameService } from './status/status.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { GuestModule } from './guest/guest.module';

@Module({
  imports: [StatusModule, EventEmitterModule.forRoot(), AuthModule, UsersModule, GuestModule],
  providers: [statusGateway,StatusBombGameService]
})
export class AppModule {}