import { Module } from '@nestjs/common';

import { AppService } from './app.service';
import { ShatraService } from './modules/shatra/shatra.service';
import { ShatraGateway } from './modules/shatra/shatra.gateway';
import { GameRoomGateway } from './modules/room/room.gateway';

@Module({
  imports: [],
  controllers: [],
  providers: [AppService, ShatraService, ShatraGateway, GameRoomGateway],
})
export class AppModule {}
