import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cors from 'cors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Настройка CORS
  app.use(
    cors({
      origin: 'http://localhost:3000', // Разрешить запросы с этого origin
      credentials: true, // Разрешить передачу учетных данных (cookies, авторизация)
    }),
  );

  await app.listen(5000);
}
bootstrap();
