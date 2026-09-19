# Glyphere — Google Apps Script Setup Guide
### Send instant Gmail notifications, process file attachments, and send automated client confirmations

This guide provides the complete, robust, and studio-ready Google Apps Script (`Code.gs`) code to power your **Initialize Brief** form on the custom services page.

---

## 1. The Apps Script Code (`Code.gs`)

Copy the entire block of code below. This script will run securely in Google's cloud whenever a client submits a brief.

```javascript
/**
 * Glyphere Custom Font Services - Form Handler & Dispatcher
 * Deployed as a Web App to process brief submissions, write to Google Sheets,
 * decode base64 file uploads, send custom designer alerts, and auto-reply to clients.
 */

// OPTIONAL: If you want notifications sent to a specific email address, type it here (e.g. "design@glyphere.com").
// If left blank "", it will automatically send notifications to the Google account that deployed this script.
var NOTIFICATION_RECIPIENT = "";

function doPost(e) {
  // CORS header to allow clean front-end cross-origin communication
  var headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  
  try {
    // Defensive check: handle manual executions inside the Google Apps Script editor
    if (!e || !e.postData || !e.postData.contents) {
      console.warn("No POST payload received. This is normal if you clicked the 'Run' button inside the editor instead of submitting the form on the website.");
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "No payload received. Use the website form to submit." }))
                           .setMimeType(ContentService.MimeType.JSON)
                           .setHeaders(headers);
    }
    
    // 1. Parse JSON payload from front-end
    var data = JSON.parse(e.postData.contents);
    
    var name = data.name || "Anonymous";
    var email = data.email || "";
    var projectType = data.project_type || "Custom Font Design";
    var budget = data.budget || "Not Specified";
    var customBudget = data.custom_budget || "";
    var vision = data.vision || "No vision provided.";
    var files = data.files || [];
    
    // Resolve final budget text
    var resolvedBudget = budget;
    if (budget === "Custom" && customBudget) {
      resolvedBudget = customBudget;
    }
    
    // 2. Resolve or Create Glyphere Uploads Folder in Google Drive
    var folder;
    try {
      var folders = DriveApp.getFoldersByName("Glyphere Custom Brief Uploads");
      if (folders.hasNext()) {
        folder = folders.next();
      } else {
        folder = DriveApp.createFolder("Glyphere Custom Brief Uploads");
      }
    } catch (folderErr) {
      console.warn("Could not access or create folder. Saving to root instead.", folderErr);
      folder = DriveApp;
    }
    
    // 3. Decode base64 attachments, upload to Drive, and compile Blobs for email
    var attachments = [];
    var driveLinks = [];
    for (var i = 0; i < files.length; i++) {
      var fileObj = files[i];
      try {
        if (fileObj.base64 && fileObj.name) {
          var decoded = Utilities.base64Decode(fileObj.base64);
          var blob = Utilities.newBlob(decoded, fileObj.type || "application/octet-stream", fileObj.name);
          attachments.push(blob);
          
          // Save file to Google Drive and retrieve shareable link
          var driveFile = folder.createFile(blob);
          driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          driveLinks.push(driveFile.getUrl());
        }
      } catch (fileErr) {
        console.error("Error decoding or saving file: " + fileObj.name, fileErr);
      }
    }
    
    // 4. Resolve destination email address
    var ownerEmail = NOTIFICATION_RECIPIENT;
    if (!ownerEmail) {
      try {
        ownerEmail = Session.getEffectiveUser().getEmail();
      } catch (sessionErr) {
        console.error("Failed to retrieve effective user email.", sessionErr);
      }
    }
    
    if (!ownerEmail) {
      throw new Error("Recipient email address could not be determined. Please specify an email in the NOTIFICATION_RECIPIENT variable at the top of the script.");
    }
    
    // 5. Build HTML Email Alert (Designer Inbox)
    var designerSubject = "✦ New Glyphere Custom Brief from " + name;
    var designerBody = `
      <div style="font-family: 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif; background: #faf7f2; padding: 3rem 2rem; color: #1c1812; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid rgba(201, 171, 129, 0.25); border-radius: 20px;">
        <div style="text-align: center; margin-bottom: 2.5rem; border-bottom: 1px solid rgba(20, 16, 9, 0.08); padding-bottom: 1.5rem;">
          <h2 style="font-family: 'Bricolage Grotesque', sans-serif; font-size: 1.8rem; margin: 0; color: #1c1812; font-weight: 800; letter-spacing: -0.02em;">New Project Brief</h2>
          <p style="font-size: 0.85rem; color: #8a6c3e; margin: 0.5rem 0 0; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700;">Glyphere Type Foundry</p>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 2rem;">
          <tr>
            <td style="padding: 0.75rem 0; font-weight: 700; color: #8a7e70; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; width: 35%;">Client Name:</td>
            <td style="padding: 0.75rem 0; color: #1c1812; font-size: 0.95rem; font-weight: 600;">${name}</td>
          </tr>
          <tr>
            <td style="padding: 0.75rem 0; font-weight: 700; color: #8a7e70; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">Email Address:</td>
            <td style="padding: 0.75rem 0; color: #8a6c3e; font-size: 0.95rem; font-weight: 600;">
              <a href="mailto:${email}" style="color: #8a6c3e; text-decoration: none; border-bottom: 1px dashed #c9ab81;">${email}</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 0.75rem 0; font-weight: 700; color: #8a7e70; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">Project Type:</td>
            <td style="padding: 0.75rem 0; color: #1c1812; font-size: 0.95rem; font-weight: 600;">${projectType}</td>
          </tr>
          <tr>
            <td style="padding: 0.75rem 0; font-weight: 700; color: #8a7e70; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">Budget Range:</td>
            <td style="padding: 0.75rem 0; color: #c9ab81; font-size: 1rem; font-weight: 700;">${resolvedBudget}</td>
          </tr>
        </table>
        
        <div style="background: #ffffff; border: 1px solid rgba(20, 16, 9, 0.06); border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem;">
          <h4 style="margin: 0 0 0.75rem; font-family: 'Bricolage Grotesque', sans-serif; font-size: 1rem; color: #1c1812; font-weight: 700;">Project Vision & Description:</h4>
          <p style="margin: 0; font-size: 0.92rem; color: #555555; white-space: pre-wrap; line-height: 1.7;">${vision}</p>
        </div>
        
        ${attachments.length > 0 ? `
          <div style="border-top: 1px dashed rgba(20, 16, 9, 0.08); padding-top: 1.5rem; margin-bottom: 1.5rem;">
            <h4 style="margin: 0 0 0.5rem; font-size: 0.85rem; color: #8a7e70; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700;">Attached Reference Assets (${attachments.length}):</h4>
            <ul style="margin: 0; padding-left: 1.25rem; font-size: 0.88rem; color: #555555;">
              ${files.map(f => `<li style="margin-bottom: 4px; font-weight: 500;">${f.name} <span style="color: #999; font-size: 0.78rem;">(${f.type})</span></li>`).join('')}
            </ul>
          </div>
        ` : ''}
        
        <div style="text-align: center; border-top: 1px solid rgba(20, 16, 9, 0.08); padding-top: 1.5rem; margin-top: 2rem;">
          <a href="mailto:${email}" style="display: inline-block; background: #111111; color: #f2e7d5; padding: 0.9rem 2rem; text-decoration: none; border-radius: 50px; font-weight: 700; font-size: 0.95rem; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">Reply directly to Client</a>
        </div>
      </div>
    `;
    
    // Dispatch email alert to designer
    var designerEmailOptions = {
      htmlBody: designerBody,
      name: "Glyphere Brief Alert"
    };
    if (attachments.length > 0) {
      designerEmailOptions.attachments = attachments;
    }
    
    GmailApp.sendEmail(ownerEmail, designerSubject, "", designerEmailOptions);
    
    // 6. Build and Send Client Auto-Reply (from studio@glyphere.com if configured as an alias)
    if (email) {
      var clientSubject = "✦ We have received your custom font brief - Glyphere";
      var clientBody = `
        <div style="font-family: 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif; background: #faf7f2; padding: 3rem 2rem; color: #1c1812; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid rgba(201, 171, 129, 0.25); border-radius: 20px;">
          <div style="text-align: center; margin-bottom: 2.5rem; border-bottom: 1px solid rgba(20, 16, 9, 0.08); padding-bottom: 1.5rem;">
            <h2 style="font-family: 'Bricolage Grotesque', sans-serif; font-size: 1.8rem; margin: 0; color: #1c1812; font-weight: 800; letter-spacing: -0.02em;">Brief Received</h2>
            <p style="font-size: 0.85rem; color: #8a6c3e; margin: 0.5rem 0 0; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700;">From Glyph to Identity</p>
          </div>
          
          <p style="font-size: 0.95rem; color: #1c1812; margin-bottom: 1.5rem; font-weight: 500;">Hello ${name},</p>
          <p style="font-size: 0.92rem; color: #555555; margin-bottom: 1.5rem; line-height: 1.7;">
            Thank you for initializing your brief with Glyphere. We have safely received your custom typeface design request and any attached reference documents.
          </p>
          
          <div style="background: #ffffff; border: 1px solid rgba(20, 16, 9, 0.06); border-radius: 12px; padding: 1.25rem; margin-bottom: 1.5rem;">
            <strong style="display: block; font-size: 0.85rem; color: #8a7e70; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem;">Summary of your request:</strong>
            <ul style="margin: 0; padding-left: 1.2rem; font-size: 0.88rem; color: #1c1812; line-height: 1.6; list-style: square;">
              <li><strong>Requested Service:</strong> ${projectType}</li>
              <li><strong>Expected Budget:</strong> ${resolvedBudget}</li>
            </ul>
          </div>
          
          <p style="font-size: 0.92rem; color: #555555; margin-bottom: 2rem; line-height: 1.7;">
            Our design studio is currently reviewing your vision. We will reach out to you within 24 hours to schedule a discovery call and align on references, mood, and project scope before a single stroke is drawn.
          </p>
          
          <div style="border-top: 1px solid rgba(20, 16, 9, 0.08); padding-top: 1.5rem; text-align: center; color: #8a7e70; font-size: 0.8rem; font-weight: 600;">
            <p style="margin: 0 0 0.25rem;">GLYPHERE TYPE FOUNDRY</p>
            <p style="margin: 0; font-weight: 400; font-size: 0.75rem;">Independent custom type design & premium publishing.</p>
          </div>
        </div>
      `;
      
      var emailOptions = {
        htmlBody: clientBody,
        name: "Glyphere"
      };
      
      // Dynamic alias check to prevent crashes
      try {
        var aliases = GmailApp.getAliases();
        if (aliases.indexOf("studio@glyphere.com") !== -1) {
          emailOptions.from = "studio@glyphere.com";
        } else {
          console.warn("studio@glyphere.com is not configured as a verified alias. Auto-reply sent from primary account instead.");
        }
      } catch (aliasErr) {
        console.warn("Could not check aliases:", aliasErr);
      }
      
      GmailApp.sendEmail(email, clientSubject, "", emailOptions);
    }
    
    // 7. Log to Google Sheet - Strictly aligned with Column Order A-H
    try {
      var sheet = SpreadsheetApp.getActiveSpreadsheet();
      if (sheet) {
        var activeSheet = sheet.getSheets()[0];
        if (activeSheet) {
          activeSheet.appendRow([
            new Date(),            // Column A: Timestamp
            name,                  // Column B: Client Name
            email,                 // Column C: Client Email
            projectType,           // Column D: Project Type
            budget,                // Column E: Budget Range
            customBudget,          // Column F: Custom Budget
            vision,                // Column G: Vision / Goals
            driveLinks.join("\n")  // Column H: File Attachments (Clickable Google Drive URLs)
          ]);
        }
      }
    } catch (sheetErr) {
      console.warn("Spreadsheet logging skipped or not linked.", sheetErr);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
                         .setMimeType(ContentService.MimeType.JSON);
                         
  } catch (err) {
    console.error("Uncaught exception in doPost: " + err.toString());
    
    // LOG ANY ERRORS DIRECTLY INTO YOUR SPREADSHEET AS A NEW ROW!
    try {
      var sheet = SpreadsheetApp.getActiveSpreadsheet();
      if (sheet) {
        var activeSheet = sheet.getSheets()[0];
        if (activeSheet) {
          activeSheet.appendRow([
            new Date(),
            "⚠️ BACKEND ERROR DETAILS",
            err.toString(),
            "Review this log to see the exact block causing the issue.",
            "",
            "",
            "",
            ""
          ]);
        }
      }
    } catch (sheetErr) {
      console.warn("Could not log error to sheet:", sheetErr);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}
```

---

## 2. Step-by-Step Deployment Guide

Follow these simple steps to update your Google Apps Script Web App:

### Step 1: Open Google Apps Script
1. Go to your [Google Sheets Dashboard](https://sheets.google.com) and open the spreadsheet connected to your submissions.
2. In the top toolbar, click **Extensions** > **Apps Script**. (If you set this up as a standalone script, go directly to [script.google.com](https://script.google.com) and open your project).

### Step 2: Paste the Code
1. In the Apps Script editor, open the `Code.gs` file.
2. Select all existing code and **delete it**.
3. **Paste the complete code block** provided in Section 1 of this guide.
4. Click the **Save** icon (disk symbol) or press `Cmd + S` (mac) / `Ctrl + S` (windows).

### Step 3: Authorize and Deploy the Web App
1. At the top-right of the Apps Script dashboard, click **Deploy** > **New deployment**.
2. Select the type as **Web App** (by clicking the cog wheel if not already selected).
3. Fill in the deployment details:
   - **Description**: `Glyphere Brief Submission V2`
   - **Execute as**: **Me (your-email@gmail.com)** *(This is critical! It must run under your account so it has permission to send emails from your Gmail address).*
   - **Who has access**: **Anyone** *(This is critical! The public website front-end needs access to POST data to this endpoint).*
4. Click **Deploy**.
5. Google will prompt you to **Authorize Access** because the script needs permission to send emails on your behalf and access your Spreadsheet. Click **Authorize access**, choose your Google Account, click **Advanced** (at the bottom), and then click **Go to [Project Name] (unsafe)** to grant permissions.

### Step 4: Copy the Web App URL
1. Once deployed, Google will display a modal containing a **Web App URL** ending in `/exec`.
2. Click **Copy** to copy this URL.

### Step 5: Update the URL in custom_font_services.html
Your front-end is already configured with your active script URL on line 873:
```javascript
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyjT5PxDq8TwPcUxN4VrzmFq-dJnEEo6-2v6Mt7845L3wVUvfX81-R6Qkg7DwZoZJ_-zg/exec";
```
If you deployed a brand new project and received a **new URL**, simply replace the URL inside double quotes on line 873 of `/main-website/custom_font_services/custom_font_services.html` with your newly copied URL!

If you updated the existing project using **Deploy > Manage Deployments > Edit**, your URL will remain exactly the same, and **no code change is needed on the website at all!**

---

## 3. Troubleshooting
- **No Email Received**: Make sure you set "Who has access" to **Anyone** and "Execute as" to **Me**. If you set "Who has access" to "Only myself", submissions will fail because public users can't send requests.
- **File Size Errors**: Gmail allows attachments up to 25MB. Encourage clients to upload image formats (PNG/JPEG) or standard PDFs that fit within this limit.
