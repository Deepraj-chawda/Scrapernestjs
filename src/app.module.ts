import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScraperModule } from './scraper/scraper.module';
import { ConfigModule } from '@nestjs/config';

import { ScraperController } from './scraper/scraper.controller';
import { EmailhlpService } from './scraper/service/emailhlp.service';
import { ScraperService } from './scraper/service/scraper.service';
@Module({
  imports: [ConfigModule.forRoot({
      isGlobal: true, // Makes the config available globally
      envFilePath: '.env', // Explicitly specify the .env file
    })
    , ScraperModule
    ],
  controllers: [ScraperController,AppController],
  providers: [AppService,ScraperService,EmailhlpService],
})
export class AppModule {}
