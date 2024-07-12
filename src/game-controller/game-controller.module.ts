import { Module } from '@nestjs/common';
import { GameControllerController } from './game-controller.controller';

@Module({
  controllers: [GameControllerController]
})
export class GameControllerModule {}
