// google-drive.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class GoogleDriveService {
  private readonly logger = new Logger(GoogleDriveService.name);
  private driveClient;
  private oauth2Client;

  constructor() {
    this.initializeOAuthClient();
  }

  private initializeOAuthClient() {
    try {
      // Load OAuth credentials
      const credentialsPath = path.join(process.cwd(), 'google-oauth-credentials.json');
      const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
      console.log(credentials);
      this.oauth2Client = new google.auth.OAuth2(
        credentials.web.client_id,
        credentials.web.client_secret,
        credentials.web.redirect_uris[0]
      );
      console.log(process.env.GOOGLE_REFRESH_TOKEN);
      // Set refresh token from environment
      this.oauth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN
      });

      this.driveClient = google.drive({
        version: 'v3',
        auth: this.oauth2Client
      });

      this.logger.log('Google Drive OAuth client initialized');
    } catch (error) {
      this.logger.error('Failed to initialize OAuth client', error);
      throw new Error('Google Drive OAuth initialization failed');
    }
  }

  async createFolder(folderName: string, parentFolderId?: string): Promise<string> {
    try {
      const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        ...(parentFolderId && { parents: [parentFolderId] }),
      };

      const { data } = await this.driveClient.files.create({
        resource: fileMetadata,
        fields: 'id',
      });

      return data.id;
    } catch (error) {
      this.logger.error(`Failed to create folder "${folderName}"`, error);
      throw new Error(`Google Drive folder creation failed: ${error.message}`);
    }
  }

  async uploadFile(filePath: string, fileName: string, folderId: string): Promise<any> {
    try {
      const fileMetadata = {
        name: fileName,
        parents: [folderId],
      };

      const media = {
        mimeType: 'application/octet-stream',
        body: fs.createReadStream(filePath),
      };

      const { data } = await this.driveClient.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id,name,webViewLink',
      });

      return data;
    } catch (error) {
      this.logger.error(`Failed to upload file "${fileName}"`, error);
      throw new Error(`Google Drive upload failed: ${error.message}`);
    }
  }
}