import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { StatusModule } from './status/status.module';
import { statusGateway } from './status/status.gateway'
import { StatusBombGameService } from './status/status.service';

@Module({
  imports: [StatusModule, EventEmitterModule.forRoot()],
  providers: [statusGateway,StatusBombGameService]
})
export class AppModule {}