import { Module } from '@nestjs/common';
import { statusGateway } from './status.gateway'

@Module({
    providers: [statusGateway,]
})
export class StatusModule {}
