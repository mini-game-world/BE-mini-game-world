import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { RandomNicknameController } from './random-nickname.controller';
import { RandomNicknameService } from './random-nickname.service';

@Module({
  imports: [HttpModule],
  controllers: [RandomNicknameController],
  providers: [RandomNicknameService]
})
export class RandomNicknameModule {}
