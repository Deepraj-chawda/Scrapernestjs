// get-refresh-token.ts
import { google } from 'googleapis';
import * as readline from 'readline';
import * as fs from 'fs';

const credentials = JSON.parse(fs.readFileSync('google-oauth-credentials.json', 'utf8'));

const oauth2Client = new google.auth.OAuth2(
  credentials.client_id,
  credentials.client_secret,
  "http://localhost"
);

const scopes = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file'
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
  prompt: 'consent' // Ensure we get a refresh token
});

console.log('Authorize this app by visiting this URL:', authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Enter the code from that page here: ', (code) => {
  oauth2Client.getToken(code, (err, token) => {
    if (err) return console.error('Error retrieving access token', err);
    console.log('Refresh token:', token.refresh_token);
    console.log('Save this to your .env file as GOOGLE_REFRESH_TOKEN');
    rl.close();
  });
});