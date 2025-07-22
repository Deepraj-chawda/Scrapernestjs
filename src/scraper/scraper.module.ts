import { Module } from '@nestjs/common';
import { ScraperController } from './scraper.controller';
import { EmailhlpService } from './service/emailhlp.service';
import { ScraperService } from './service/scraper.service';

@Module({
  controllers: [ScraperController],
  providers: [ScraperService,EmailhlpService]
})
export class ScraperModule {}
