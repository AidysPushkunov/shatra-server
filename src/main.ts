import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cors from 'cors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Настройка CORS
  app.use(
    cors({
      origin: 'https://shatra.vercel.app', // Разрешить запросы с этого origin
      credentials: true, // Разрешить передачу учетных данных (cookies, авторизация)
    }),
  );

  // Изменяем прослушиваемый порт на 80 и используем HTTP
  await app.listen(80, '0.0.0.0'); // Прослушиваем все интерфейсы на порту 80

  console.log('Application is running on: http://45.147.179.12:80');
}
bootstrap();
