import { Module } from '@nestjs/common';
import { ScraperController } from './scraper.controller';
import { EmailhlpService } from './service/emailhlp.service';
import { ScraperService } from './service/scraper.service';
import { GoogleDriveService } from './service/google-drive.service';

@Module({
  controllers: [ScraperController],
  providers: [ScraperService,EmailhlpService, GoogleDriveService]
})
export class ScraperModule {}
