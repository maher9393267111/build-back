const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

// Configuration
const SITE_URL = process.env.SITE_URL || 'https://letsbuildsw.co.uk';
const CREDENTIALS_PATH = path.join(__dirname, './google-credentials.json');

// Initialize auth client
const getJWTClient = () => {
  try {
    // Check if credentials file exists
    if (!fs.existsSync(CREDENTIALS_PATH)) {
      console.error('Google API credentials file not found');
      return null;
    }

    const credentials = require(CREDENTIALS_PATH);
    const jwtClient = new google.auth.JWT(
      credentials.client_email,
      null,
      credentials.private_key,
      ['https://www.googleapis.com/auth/indexing'],
    );

    return jwtClient;
  } catch (error) {
    console.error('Error initializing Google API client:', error);
    return null;
  }
};

/**
 * Submit URL to Google for indexing
 * @param {string} url - The URL to submit for indexing
 * @param {string} type - Either 'URL_UPDATED' or 'URL_DELETED'
 */
const submitUrlToGoogle = async (url, type = 'URL_UPDATED') => {
  try {
    console.log(`Submitting URL to Google: ${url} (${type})`);
    
    // Get JWT client
    const jwtClient = getJWTClient();
    if (!jwtClient) return false;
    
    // Authorize
    await jwtClient.authorize();
    
    // Make API request
    const indexing = google.indexing({
      version: 'v3',
      auth: jwtClient
    });
    
    const result = await indexing.urlNotifications.publish({
      requestBody: {
        url: url,
        type: type
      }
    });
    
    console.log('Google indexing response:', result.data);
    return true;
  } catch (error) {
    console.error('Error submitting URL to Google:', error);
    return false;
  }
};

/**
 * Notify Google about a page URL
 * @param {Object} page - The page object with slug
 * @param {string} action - create, update, or delete
 */
exports.notifyGoogleAboutPage = async (page, action) => {
  try {
    // Build the full URL
    const fullUrl = page.isMainPage 
      ? SITE_URL 
      : `${SITE_URL}/${page.slug}`;
    
    if (action === 'delete') {
      await submitUrlToGoogle(fullUrl, 'URL_DELETED');
    } else {
      await submitUrlToGoogle(fullUrl, 'URL_UPDATED');
    }
  } catch (error) {
    console.error('Error notifying Google about page:', error);
  }
}; 