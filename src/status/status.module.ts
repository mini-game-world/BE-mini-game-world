import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { StatusGateway } from './status.gateway'
import { StatusBombGameService } from './status.service';
import { CacheModule } from '../cache/cache.module';
import { RandomNicknameModule } from '../random-nickname/random-nickname.module';

@Module({
    imports: [EventEmitterModule.forRoot(), CacheModule, RandomNicknameModule],
    providers: [StatusGateway, StatusBombGameService]
})
export class StatusModule { }
