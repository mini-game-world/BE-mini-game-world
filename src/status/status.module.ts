import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { statusGateway } from './status.gateway'
import { StatusBombGameService } from './status.service';

@Module({
    imports: [EventEmitterModule.forRoot()],
    providers: [statusGateway, StatusBombGameService],
    exports: [StatusBombGameService]
})
export class StatusModule { }
