import { Injectable, Logger } from '@nestjs/common';
import * as Imap from 'imap';
import { simpleParser } from 'mailparser';
import * as fs from 'fs';
import * as csv from 'csv-writer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailhlpService {
constructor(private readonly configService: ConfigService) {}
    private readonly logger = new Logger(EmailhlpService.name);

  async getVerificationCode(): Promise<string> {
    return new Promise((resolve, reject) => {
      const imap = new Imap({
        user: this.configService.get<string>('IMAP_USER'),
       password: this.configService.get<string>('IMAP_PASSWORD'),
      host: this.configService.get<string>('IMAP_HOST') || 'imap.gmail.com',
      port: this.configService.get<number>('IMAP_PORT') || 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false }
      });

      imap.once('ready', () => {
        imap.openBox('INBOX', false, (err, box) => {
          if (err) {
            this.logger.error('Error opening inbox', err);
            return reject(err);
          }

          // Search for the latest verification email
          imap.search(['UNSEEN', ['FROM', 'noreply@signin.autodesk.com']], (searchErr, results) => {
            if (searchErr || results.length === 0) {
              this.logger.error('No verification email found');
              console.log('No verification email found');
              return reject(searchErr || new Error('No verification email found'));
            }

            const latestUid = results.pop();
            const fetch = imap.fetch(latestUid, { bodies: '' });

            fetch.on('message', (msg) => {
              msg.on('body', (stream) => {
                simpleParser(stream, async (parseErr, mail) => {
                  if (parseErr) {
                    this.logger.error('Error parsing email', parseErr);
                    return reject(parseErr);
                  }
             
                  // Extract verification code from email text
                  const codeMatch = mail.text.match(/Code:\s*(\d{6})\s*(?:\n|$)/i);
                    if (codeMatch && codeMatch[1]) {
                    resolve(codeMatch[1]);
                    } else {
                    // Fallback pattern if the first one doesn't match
                    const altCodeMatch = mail.text.match(/one-time passcode \(OTP\)[:\s]*(\d{6})/i);
                    if (altCodeMatch && altCodeMatch[1]) {
                        resolve(altCodeMatch[1]);
                    } else {
                        reject(new Error('Verification code not found in email'));
                    }
                    }
                });
              });
            });

            fetch.once('error', (fetchErr) => {
              this.logger.error('Error fetching email', fetchErr);
              reject(fetchErr);
            });
          });
        });
      });

      imap.once('error', (err) => {
        this.logger.error('IMAP error', err);
        reject(err);
      });

      imap.connect();
    });
  }

  async saveToJson(data: any, filename: string): Promise<void> {
    await fs.promises.writeFile(filename, JSON.stringify(data, null, 2));
  }

  async saveToCsv(data: any[], filename: string): Promise<void> {
    if (!data || data.length === 0) return;

    const csvWriter = csv.createObjectCsvWriter({
      path: filename,
      header: Object.keys(data[0]).map(key => ({ id: key, title: key })),
    });

    await csvWriter.writeRecords(data);
  }
}
