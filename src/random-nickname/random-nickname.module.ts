import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { RandomNicknameController } from './random-nickname.controller.js';
import { RandomNicknameService } from './random-nickname.service.js';

@Module({
  imports: [HttpModule],
  controllers: [RandomNicknameController],
  providers: [RandomNicknameService],
  exports:[RandomNicknameService]
})
export class RandomNicknameModule {}
