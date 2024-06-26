import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { StatusGateway } from './status.gateway.js';
import { StatusBombGameService } from './status.service.js';
import { CacheModule } from '../cache/cache.module.js';
import { RandomNicknameModule } from '../random-nickname/random-nickname.module.js';

@Module({
  imports: [EventEmitterModule.forRoot(), CacheModule, RandomNicknameModule],
  providers: [StatusGateway, StatusBombGameService],
})
export class StatusModule {}
