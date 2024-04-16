import { Module } from '@nestjs/common';

import { AppService } from './app.service';
import { RoomService } from './modules/room/room.service';
import { RoomGateway } from './modules/room/room.gateway';

@Module({
  imports: [],
  controllers: [],
  providers: [AppService, RoomGateway, RoomService],
})
export class AppModule {}
