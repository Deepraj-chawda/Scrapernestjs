import { Injectable, Logger } from '@nestjs/common';

import { EmployeeDto } from '../dto/employee.dto';
import { EmailhlpService } from './emailhlp.service';
import { chromium } from 'playwright';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);
  private readonly baseUrl = 'https://app.buildingconnected.com';
  private readonly loginUrl = `${this.baseUrl}/login?retUrl=%2F`;
  private readonly rateLimit = 3000; // 3 seconds in ms
  private lastRequestTime = 0;

  constructor(
    private readonly emailService: EmailhlpService,
    private readonly configService: ConfigService
  ) {}

  private async enforceRateLimit(): Promise<void> {
    const elapsed = Date.now() - this.lastRequestTime;
    if (elapsed < this.rateLimit) {
      await new Promise(resolve => setTimeout(resolve, this.rateLimit - elapsed));
    }
    this.lastRequestTime = Date.now();
  }

  async scrapeEmployees(): Promise<EmployeeDto[]> {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();
    const credentials = {
      email: this.configService.get<string>('BC_EMAIL'),
      password: this.configService.get<string>('BC_PASSWORD'),
    };
    console.log(this.configService.get<string>('BC_EMAIL'));
    console.log(this.configService.get<string>('BC_PASSWORD'));
    console.log(credentials);

    if (!credentials.email || !credentials.password) {
      throw new Error('BuildingConnected credentials not configured');
    }
    try {
      // Login process
      await this.login(page, credentials);
      
      // Extract employee data
      const employees = await this.extractEmployeeData(page);
      
      // Save data to files
      await this.emailService.saveToJson(employees, 'buildingconnected_data.json');
      await this.emailService.saveToCsv(employees, 'buildingconnected_data.csv');
      
      return employees;
    } catch (error) {
      this.logger.error('Scraping failed', error.stack);
      throw error;
    } finally {
      await browser.close();
    }
  }

  private async login(page, credentials): Promise<void> {
    await this.enforceRateLimit();
    await page.goto(this.loginUrl);
    await page.waitForTimeout(4000);

    // Enter email and click next
    await page.fill('#emailField', credentials.email);
    await page.click('button[aria-label="NEXT"]');

    // Click verify button
    await page.waitForSelector('#verify_user_btn');
    await page.click('#verify_user_btn');

    // Enter password and submit
    await page.waitForSelector('#password');
    await page.fill('#password', credentials.password);
    await page.click('#btnSubmit');

    // Wait for OTP page and get code from email
    await page.waitForSelector('#VerificationCode');
    const otpCode = await this.emailService.getVerificationCode();
    
    // Enter OTP and submit
    await page.fill('#VerificationCode', otpCode);
    await page.click('#btnSubmit');

    // Wait for login to complete
    await page.waitForNavigation();
    this.logger.log('Login successful');
  }

  private async extractEmployeeData(page): Promise<EmployeeDto[]> {
    await this.enforceRateLimit();
    await page.goto('https://app.buildingconnected.com/companies/68525131d62066154bfd00ed/employees');
    
    // Wait for employee data container
    await page.waitForSelector('.ReactVirtualized__Grid__innerScrollContainer');
    
    // Get all employee rows
    const rows = await page.$$('.ReactVirtualized__Table__row');
    const employees: EmployeeDto[] = [];

    for (const row of rows) {
      try {
        console.log(row);
        // Extract employee data
        const name = await row.$eval('[data-id="user-name"]', el => el.textContent.trim());
        const email = await row.$eval('[data-id="employee-email"]', el => el.textContent.trim());
        
        // Optional fields
        const phone = await row.$('[data-id="employee-phone"]').then(el => el ? el.evaluate(node => node.textContent.trim()) : '').catch(() => '');const title = await row.$('div[class*="title-"][title]').then(el => el ? el.evaluate(node => node.textContent.trim()) : '').catch(() => '');
        const initials = await row.$('[data-id="user-avatar"]').then(el => el ? el.evaluate(node => node.textContent.trim()) : '').catch(() => '');

        // Check if is lead
        const isLead = await row.$('[data-id="toggle-lead-checkbox"][checked]').then(() => 'Yes').catch(() => 'No');

        employees.push({
          initials,
          name,
          email,
          phone,
          title,
          is_lead: isLead,
        });
      } catch (error) {
        this.logger.warn(`Error processing row: ${error.message}`);
        continue;
      }
    }

    return employees;
  }
}