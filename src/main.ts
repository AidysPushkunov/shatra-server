import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cors from 'cors';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    httpsOptions: {
      key: fs.readFileSync('/etc/letsencrypt/live/shatra.ru/privkey.pem'),
      cert: fs.readFileSync('/etc/letsencrypt/live/shatra.ru/fullchain.pem'),
    },
  });

  // Настройка CORS
  app.use(
    cors({
      origin: 'https://shatra.vercel.app', // Разрешить запросы с этого origin
      credentials: true, // Разрешить передачу учетных данных (cookies, авторизация)
    }),
  );

  await app.listen(443);

  console.log('Application is running on: https://shatra.ru');
}

bootstrap();
