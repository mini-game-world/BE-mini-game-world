import { Module } from '@nestjs/common';
import { statusGateway } from './status.gateway'
import { StatusBombGameService } from './status.service';

@Module({
    providers: [statusGateway,StatusBombGameService]
})
export class StatusModule {}
