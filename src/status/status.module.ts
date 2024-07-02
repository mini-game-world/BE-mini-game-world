import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { statusGateway } from './status.gateway';
import { StatusBombGameService } from './status.service';
import { CacheModule } from '../cache/cache.module';
import { RandomNicknameModule } from '../random-nickname/random-nickname.module';
import { RankService } from './rank.service';

@Module({
    imports: [EventEmitterModule.forRoot(), CacheModule, RandomNicknameModule],
    providers: [statusGateway, StatusBombGameService,RankService],
    exports: [StatusBombGameService],
})
export class StatusModule { }
