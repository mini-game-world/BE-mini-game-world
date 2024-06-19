import { Module } from '@nestjs/common';
import { statusGateway } from './status.gateway'
import { StatusBombGameService } from './status.service';
import { EventEmitter2 } from "@nestjs/event-emitter";

@Module({
    providers: [statusGateway,StatusBombGameService,EventEmitter2]
})
export class StatusModule {}
