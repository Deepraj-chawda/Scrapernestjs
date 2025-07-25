# BuildingConnected Scraper with Google Drive Integration
This NestJS application scrapes project documents from BuildingConnected and uploads them to Google Drive while maintaining the folder structure.

## Prerequisites
Node.js (v16+ recommended)

npm or yarn

Google account

BuildingConnected account credentials

### Setup Instructions
1. Clone the repository
    ```
    git clone https://github.com/your-repo/building-connected-scraper.git

    cd building-connected-scraper
    
2. Install dependencies

    ```
        npm install
        # or
        yarn install
    ```


3. Set up Google Drive OAuth Credentials

    Step-by-step guide:
 i) Go to [Google Cloud Console](https://console.cloud.google.com/)

* Create a new project or select an existing one

ii) Enable the Google Drive API

* Navigate to "APIs & Services" > "Library"

* Search for "Google Drive API" and enable it

iii) Create OAuth 2.0 credentials

* Go to "APIs & Services" > "Credentials"

* Click "Create Credentials" > "OAuth client ID"

* Select "Desktop app" as application type

* Name your OAuth client (e.g., "BuildingConnected Scraper")

* Click "Create"

iv) Download credentials

* Click the download icon next to your new OAuth client

* Save the file as google-oauth-credentials.json in your project root

v) Configure OAuth consent screen

* Go to "OAuth consent screen"

* Set application type to "External"

* Add your application name and support email

* Add scopes:

    .../auth/drive

    .../auth/drive.file

* Add your email as a test user


4. Get Refresh Token

Run the following command to get your refresh token:

   
    npx ts-node get-refresh-token.ts
    
* Follow the instructions to:

i) Visit the authorization URL

ii) Log in with your Google account

iii) Copy the authorization code

iv) Paste it back into the terminal

v) Save the refresh token in your .env file:

    GOOGLE_REFRESH_TOKEN=your_refresh_token_here

5. Configure Environment Variables

Create a .env file in your project root with these variables:

 
    # BuildingConnected credentials
    BC_EMAIL=your_buildingconnected@email.com
    BC_PASSWORD=your_password

    # IMAP credentials for OTP retrieval
    IMAP_USER=your_email@email.com
    IMAP_PASSWORD=your_app_password
    IMAP_HOST=imap.gmail.com

    # Google Drive credentials
    GOOGLE_DRIVE_JSON_FILE=F:\nestJS\building-scraper\google-service-account.json

    #BuildingConnected Project ID
    ProjectID=your_buildingconnect_projectID

    GOOGLE_REFRESH_TOKEN=your_referesh_token

6. Run the Application

Development mode:

    npm run start:dev

Production mode:

    npm run build
    npm run start:prod

### API Endpoints
Get project files and upload to Google Drive

    GET /scraper/projectfiles
Example:


    curl http://localhost:3000/scraper/projectfiles
Response:

   
    {
    "success": true,
    "message": "Files uploaded to Google Drive",
    "driveFolderId": "1AbCdEfGhIjKlMnOpQrStUvWxYz"
    }

