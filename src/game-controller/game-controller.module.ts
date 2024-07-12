import { Module } from '@nestjs/common';
import { GameControllerController } from './game-controller.controller.js';
import { StatusModule } from '../status/status.module.js';

@Module({
  imports:[ StatusModule],
  controllers: [GameControllerController]
})
export class GameControllerModule {}
