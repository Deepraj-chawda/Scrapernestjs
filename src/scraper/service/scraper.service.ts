import { Injectable, Logger } from '@nestjs/common';

import { EmployeeDto } from '../dto/employee.dto';
import { EmailhlpService } from './emailhlp.service';
import { chromium } from 'playwright';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as extract from 'extract-zip';
import { GoogleDriveService } from './google-drive.service';

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);
  private readonly baseUrl = 'https://app.buildingconnected.com';
  private readonly loginUrl = `${this.baseUrl}/login?retUrl=%2F`;
  private readonly rateLimit = 3000; // 3 seconds in ms
  private lastRequestTime = 0;
private readonly downloadDir = path.join(__dirname, '..', '..', 'downloads');
  constructor(
    private readonly emailService: EmailhlpService,
    private readonly configService: ConfigService,
    private readonly googleDriveService: GoogleDriveService
  ) {}

  private async enforceRateLimit(): Promise<void> {
    const elapsed = Date.now() - this.lastRequestTime;
    if (elapsed < this.rateLimit) {
      await new Promise(resolve => setTimeout(resolve, this.rateLimit - elapsed));
    }
    this.lastRequestTime = Date.now();
  }

  async scrapeEmployees(): Promise<{ success: boolean; message: string; driveFolderId?: string }> {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
      acceptDownloads: true,
    });
    const page = await context.newPage();

    // Optional: Set up download handling to save files to this.downloadDir
    page.on('download', async (download) => {
      const filePath = path.join(this.downloadDir, await download.suggestedFilename());
      console.log(`Downloading file to: ${filePath}`);
      await download.saveAs(filePath);
    });
   
    const credentials = {
      email: this.configService.get<string>('BC_EMAIL'),
      password: this.configService.get<string>('BC_PASSWORD'),
    };
    // console.log(this.configService.get<string>('BC_EMAIL'));
    // console.log(this.configService.get<string>('BC_PASSWORD'));
    // console.log(credentials);

    if (!credentials.email || !credentials.password) {
      throw new Error('BuildingConnected credentials not configured');
    }
    try {
      // Login process
      await this.login(page, credentials);
      
      // Extract employee data
      //const employees = await this.extractEmployeeData(page);
      
      // Save data to files
      // await this.emailService.saveToJson(employees, 'buildingconnected_data.json');
      // await this.emailService.saveToCsv(employees, 'buildingconnected_data.csv');
      
      // return employees;
// Download files
      const projectId = this.configService.get<string>('ProjectID');
      this.logger.log(`Downloading files for project ID: ${projectId}`);
      
      // Ensure download directory exists
      if (!fs.existsSync(this.downloadDir)) {
        fs.mkdirSync(this.downloadDir, { recursive: true });
      }
        // Download project files
        const zipPath = await this.downloadProjectFiles(page, projectId);
        this.logger.log(`Downloaded ZIP file: ${zipPath}`);
          // Create folder in Google Drive
          const folderId = await this.googleDriveService.createFolder(
            `Project_${projectId}`
          );
          this.logger.log(`Created Google Drive folder: ${folderId}`);
          
          // Upload to Google Drive
          // await this.googleDriveService.uploadFile(
          //   zipPath,
          //   path.basename(zipPath),
          //   folderId
          // );

        
   

        // // Extract ZIP contents
        const extractPath = path.join(this.downloadDir, `extracted_${projectId}`);
        await this.extractZip(zipPath, extractPath);
        this.logger.log(`Extracted files to: ${extractPath}`);

       
        // // Upload all extracted files
        const uploadResults = await this.uploadDirectoryToDrive(extractPath, folderId);
        this.logger.log(`Uploaded ${uploadResults.length} files to Google Drive`);

        // // Clean up temporary files
        fs.rmSync(extractPath, { recursive: true, force: true });
        fs.unlinkSync(zipPath);

         return { 
            success: true, 
            message: 'Files uploaded to Google Drive',
            driveFolderId: folderId
          };
    } catch (error) {
      this.logger.error('Scraping failed', error.stack);
      throw error;
    } finally {
      await browser.close();
    }
  }

  private async uploadDirectoryToDrive(dirPath: string, parentFolderId: string): Promise<any[]> {
    const results = [];
    const items = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const item of items) {
        const fullPath = path.join(dirPath, item.name);
        
        if (item.isDirectory()) {
            // Create subfolder in Drive
            const folderId = await this.googleDriveService.createFolder(item.name, parentFolderId);
            // Recursively upload contents
            const subResults = await this.uploadDirectoryToDrive(fullPath, folderId);
            results.push(...subResults);
        } else {
            // Upload file
            const result = await this.googleDriveService.uploadFile(
                fullPath,
                item.name,
                parentFolderId
            );
            results.push(result);
        }
    }

    return results;
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
    await page.waitForTimeout(3000);
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

  private async waitForDownload(timeout = 60000): Promise<string> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const files = fs.readdirSync(this.downloadDir)
      .filter(file => !file.endsWith('.crdownload'));
    
    if (files.length > 0) {
      const latestFile = files.reduce((prev, curr) => {
        const prevTime = fs.statSync(path.join(this.downloadDir, prev)).mtimeMs;
        const currTime = fs.statSync(path.join(this.downloadDir, curr)).mtimeMs;
        return currTime > prevTime ? curr : prev;
      });
      this.logger.log(`Download completed: ${latestFile}`);
      return path.join(this.downloadDir, latestFile);
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error('Download timeout');
}

private async extractZip(zipPath: string, outputPath: string): Promise<void> {
  return extract(zipPath, { dir: outputPath });
}

async downloadProjectFiles(page, projectId: string): Promise<string> {
  await page.goto(`https://app.buildingconnected.com/projects/${projectId}/files`);
  
  await page.click("[data-id='select-col']");
  await page.waitForTimeout(1000);
  
  await page.click("[data-testid='moreVertical']");
  await page.waitForTimeout(1000);
  
  await page.click("[data-testid='menu-item--download']");
  
  return this.waitForDownload();
}
}