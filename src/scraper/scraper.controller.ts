import { Controller, Get } from '@nestjs/common';
import { ScraperService } from './service/scraper.service';

@Controller('scraper')
export class ScraperController {
  constructor(private readonly scraperService: ScraperService) {}

  @Get('projectfiles')
  async scrapeEmployees() {
    return this.scraperService.scrapeEmployees();
  }

  
}