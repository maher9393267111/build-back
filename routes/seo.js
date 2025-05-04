const express = require('express');
const router = express.Router();
const { auth, restrictTo } = require('../utils/AuthMiddleware');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Helper function to consistently send API responses
function sendApiResponse(res, data, errorCode = null) {
  try {
    // If error code is provided, we're sending an error response
    if (errorCode) {
      return res.status(errorCode).json({
        success: false,
        ...data
      });
    }
    
    // Success response
    return res.status(200).json({
      success: true,
      ...data
    });
  } catch (sendError) {
    // Last resort error handling if JSON serialization fails
    console.error('Error sending API response:', sendError);
    return res.status(500).send('Internal Server Error: Failed to generate response');
  }
}

// Initialize Google Generative AI with your API key
const API_KEY = 
 "AIzaSyB0DbcbYw1xxESK3tfXVTfiPX5ah_G1XFI";

const genAI = new GoogleGenerativeAI(API_KEY);
// Try a different model for better response time
const model = genAI.getGenerativeModel({ 
  model: "gemini-1.5-pro-latest",
  systemInstruction: "You are an SEO expert assistant that always responds with valid, well-formed JSON only when asked to do so. Your responses should be concise and accurate. Focus on formatting output correctly as JSON."
});

// Helper function to safely clean and parse JSON
function safeJsonParse(text) {
  try {
    // First extract JSON if it's in a code block
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || 
                       text.match(/```\n([\s\S]*?)\n```/) ||
                       text.match(/{[\s\S]*}/);
    
    let jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text;
    
    // Handle HTML tags in suggestedHeadingStructure
    jsonStr = jsonStr.replace(/<h([1-6])>/gi, '"H$1: ').replace(/<\/h[1-6]>/gi, '"');
    
    // Clean the string to help with parsing
    jsonStr = jsonStr
      .replace(/[\r\n]+/g, ' ')
      .replace(/,\s*}/g, '}') // Remove trailing commas in objects
      .replace(/,\s*]/g, ']') // Remove trailing commas in arrays
      .trim();
    
    // Fix multiline strings in JSON that break parsing
    jsonStr = jsonStr.replace(/"\s+/g, '" ').replace(/\s+"/g, ' "');
    
    // Log the cleaned JSON string for debugging - don't truncate
    console.log("Cleaned JSON string:", jsonStr);
    
    // Try straightforward parsing first
    try {
      const parsed = JSON.parse(jsonStr);
      
      // Normalize the parsed data to ensure consistent structure
      return normalizeResponseData(parsed);
    } catch (e) {
      console.log('Initial JSON parsing failed, trying with more cleaning...', e.message);
      // Log the full problematic string for debugging
      console.log("Problematic JSON:", jsonStr);
      
      // Replace single quotes with double quotes (common AI mistake)
      jsonStr = jsonStr.replace(/'/g, '"');
      
      // Handle potential HTML tags in suggestions
      jsonStr = jsonStr.replace(/<[^>]*>/g, '');
      
      // Remove any non-JSON text before the first curly brace
      const firstCurly = jsonStr.indexOf('{');
      if (firstCurly > 0) {
        jsonStr = jsonStr.substring(firstCurly);
      }
      
      // Remove any non-JSON text after the last curly brace
      const lastCurly = jsonStr.lastIndexOf('}');
      if (lastCurly !== -1 && lastCurly < jsonStr.length - 1) {
        jsonStr = jsonStr.substring(0, lastCurly + 1);
      }
      
      // Try parsing again
      const parsed = JSON.parse(jsonStr);
      return normalizeResponseData(parsed);
    }
  } catch (error) {
    console.error('Error safely parsing JSON:', error);
    throw error;
  }
}

// Helper function to normalize the response data structure
function normalizeResponseData(data) {
  // Ensure all expected fields exist with appropriate defaults
  const normalized = {
    seoScore: typeof data.seoScore === 'number' ? data.seoScore : 0,
    titleScore: typeof data.titleScore === 'number' ? data.titleScore : 0,
    metaDescriptionScore: typeof data.metaDescriptionScore === 'number' ? data.metaDescriptionScore : 0,
    keywordsScore: typeof data.keywordsScore === 'number' ? data.keywordsScore : 0,
    urlStructureScore: typeof data.urlStructureScore === 'number' ? data.urlStructureScore : 0,
    contentStructureScore: typeof data.contentStructureScore === 'number' ? data.contentStructureScore : 0,
    contentScore: typeof data.contentScore === 'number' ? data.contentScore : 0,
    readabilityScore: data.readabilityScore === null ? null : (typeof data.readabilityScore === 'number' ? data.readabilityScore : 0),
    recommendedContentLength: typeof data.recommendedContentLength === 'number' ? data.recommendedContentLength : 0,
    
    titleAnalysis: typeof data.titleAnalysis === 'string' ? data.titleAnalysis : "No analysis available",
    metaDescriptionAnalysis: typeof data.metaDescriptionAnalysis === 'string' ? data.metaDescriptionAnalysis : "No analysis available",
    keywordsAnalysis: typeof data.keywordsAnalysis === 'string' ? data.keywordsAnalysis : "No analysis available",
    urlStructureAnalysis: typeof data.urlStructureAnalysis === 'string' ? data.urlStructureAnalysis : "No analysis available",
    contentStructureRecommendations: typeof data.contentStructureRecommendations === 'string' ? data.contentStructureRecommendations : "No recommendations available",
    
    titleSuggestions: Array.isArray(data.titleSuggestions) ? data.titleSuggestions : [],
    metaDescriptionSuggestions: Array.isArray(data.metaDescriptionSuggestions) ? data.metaDescriptionSuggestions : [],
    recommendedKeywords: Array.isArray(data.recommendedKeywords) ? data.recommendedKeywords : [],
    additionalRecommendations: Array.isArray(data.additionalRecommendations) ? data.additionalRecommendations : [],
    contentImprovementSuggestions: Array.isArray(data.contentImprovementSuggestions) ? data.contentImprovementSuggestions : [],
    
    // Handle special cases
    keywordDensity: data.keywordDensity && typeof data.keywordDensity === 'object' ? data.keywordDensity : {},
    suggestedHeadingStructure: processHeadingStructure(data.suggestedHeadingStructure)
  };
  
  return normalized;
}

// Helper function to process heading structure in various formats
function processHeadingStructure(headingData) {
  if (!headingData) return [];
  
  // If it's already an array, use it
  if (Array.isArray(headingData)) {
    return headingData;
  }
  
  // If it's an object with numbered keys, convert to array
  if (typeof headingData === 'object') {
    const headings = [];
    for (const key in headingData) {
      if (headingData.hasOwnProperty(key)) {
        headings.push(headingData[key]);
      }
    }
    return headings.length > 0 ? headings : [];
  }
  
  // If it's a string, try to split it
  if (typeof headingData === 'string') {
    return headingData.split('\n').filter(item => item.trim() !== '');
  }
  
  return [];
}

// Helper function to retry API calls with exponential backoff
async function retryWithBackoff(fn, maxRetries = 2, initialDelay = 1000) {
  let retries = 0;
  let delay = initialDelay;
  
  while (true) {
    try {
      return await fn();
    } catch (error) {
      if (retries >= maxRetries) {
        throw error; // Retries exhausted, rethrow the error
      }
      
      console.log(`Retrying API call, attempt ${retries + 1} of ${maxRetries}...`);
      
      // Wait for the delay period
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Increase delay for next retry (exponential backoff)
      delay *= 2;
      retries++;
    }
  }
}

// Helper function to analyze SEO data with Gemini
async function analyzeWithGemini(pageData, content) {
  try {
    // Prepare the comprehensive content for analysis
    const prompt = `
    As an SEO specialist, analyze and provide recommendations for this page and its content:
    
    **Page Metadata:**
    Title: ${pageData.title || 'N/A'}
    Meta Title: ${pageData.metaTitle || pageData.title || 'N/A'}
    Meta Description: ${pageData.description || 'N/A'}
    Meta Keywords: ${pageData.metaKeywords || 'N/A'}
    Slug: ${pageData.slug || 'N/A'}
    Canonical URL: ${pageData.canonicalUrl || 'N/A'}
    Robots: ${pageData.robots || 'index, follow'}
    OG Image: ${pageData.ogImage ? 'Present' : 'Missing'}
    H1 Heading: ${pageData.h1Heading || 'Missing'}
    Number of sections: ${pageData.blocks?.length || 0}

    **Page Content:**
    ${content || 'No content provided for analysis.'}
    
    Provide the following in a single, valid JSON format:
    
    **Overall SEO Analysis:**
    1. "seoScore": number from 0-100 (overall page SEO)
    2. "titleScore": number from 0-100
    3. "titleAnalysis": string with analysis
    4. "titleSuggestions": array of suggestions
    5. "metaDescriptionScore": number from 0-100
    6. "metaDescriptionAnalysis": string with analysis
    7. "metaDescriptionSuggestions": array of suggestions
    8. "keywordsScore": number from 0-100 (based on meta keywords)
    9. "keywordsAnalysis": string with analysis
    10. "recommendedKeywords": array of keywords (overall suggestions)
    11. "urlStructureScore": number from 0-100
    12. "urlStructureAnalysis": string with analysis
    13. "contentStructureScore": number from 0-100 (based on headings, blocks)
    14. "contentStructureRecommendations": string with recommendations
    15. "additionalRecommendations": array of general SEO recommendations
    
    **Content Optimization Analysis:**
    16. "contentScore": number from 0-100 (based on provided text content)
    17. "keywordDensity": object with analysis of keywords within the provided content
    18. "readabilityScore": number from 0-100 (Flesch-Kincaid or similar, for the provided content)
    19. "contentImprovementSuggestions": array of specific suggestions for improving the provided text
    20. "suggestedHeadingStructure": suggested heading structure (like H2, H3) for the provided content
    21. "recommendedContentLength": recommended word count for the provided content topic
    
    Format your response as valid, parseable JSON only. Ensure all keys are present even if the value is null or empty array/object.
    `;
    
    // Generate content with Gemini
    let responseData;
    try {
      // Use retry mechanism without timeout
      const makeAIRequest = async () => {
        const result = await model.generateContent(prompt);
        return result;
      };
      
      // Attempt the call with retries
      const result = await retryWithBackoff(makeAIRequest);
      const response = await result.response;
      const text = response.text();
      console.log("RESPONSE ---",text);
      
      try {
        // Use the safe JSON parse helper
        responseData = safeJsonParse(text);
      } catch (parseError) {
        // If parsing fails, return a structured response
        console.error('Error parsing Gemini response:', parseError);
        responseData = { 
          seoScore: 0,
          titleScore: 0,
          metaDescriptionScore: 0,
          keywordsScore: 0,
          urlStructureScore: 0,
          contentStructureScore: 0,
          titleAnalysis: "Analysis Error",
          metaDescriptionAnalysis: "Analysis Error",
          keywordsAnalysis: "Analysis Error",
          urlStructureAnalysis: "Analysis Error",
          contentStructureRecommendations: "Analysis Error",
          titleSuggestions: [],
          metaDescriptionSuggestions: [],
          recommendedKeywords: [],
          additionalRecommendations: [],
          contentScore: 0,
          keywordDensity: {},
          readabilityScore: 0,
          contentImprovementSuggestions: [],
          suggestedHeadingStructure: [],
          recommendedContentLength: 0,
          error: true, 
          rawResponse: text,
          message: 'Received non-JSON response from AI' 
        };
      }
    } catch (aiError) {
      console.error('Error generating content with AI:', aiError);
      responseData = {
        seoScore: 0,
        error: true,
        message: 'Error generating SEO analysis with AI',
        details: aiError.message
      };
    }
    
    return responseData;
  } catch (error) {
    console.error('Error in analyzeWithGemini:', error);
    return { 
      seoScore: 0,
      titleScore: 0,
      metaDescriptionScore: 0,
      keywordsScore: 0,
      urlStructureScore: 0,
      contentStructureScore: 0,
      titleAnalysis: "Analysis Error",
      metaDescriptionAnalysis: "Analysis Error",
      keywordsAnalysis: "Analysis Error",
      urlStructureAnalysis: "Analysis Error",
      contentStructureRecommendations: "Analysis Error",
      titleSuggestions: [],
      metaDescriptionSuggestions: [],
      recommendedKeywords: [],
      additionalRecommendations: [],
      contentScore: 0,
      keywordDensity: {},
      readabilityScore: 0,
      contentImprovementSuggestions: [],
      suggestedHeadingStructure: [],
      recommendedContentLength: 0,
      error: true, 
      message: error.message || 'Failed to analyze with Gemini' 
    };
  }
}

// Endpoint to analyze SEO for a page
router.post('/analyze', auth, async (req, res) => {
  try {
    const { pageData, content } = req.body;
    
    // Ensure pageData exists
    if (!pageData) {
      return sendApiResponse(res, { error: true, message: 'Missing pageData in request body' }, 400);
    }
    
    // Extract H1 heading from blocks if available
    if (pageData.blocks && pageData.blocks.length > 0) {
      const heroBlocks = pageData.blocks.filter(block => 
        block.type === 'hero' || block.content?.heading);
      
      if (heroBlocks.length > 0) {
        pageData.h1Heading = heroBlocks[0].content?.heading || '';
      }
    }
    
    let analysis;
    try {
      // Pass both pageData and content to the analysis function
      analysis = await analyzeWithGemini(pageData, content);
    } catch (aiError) {
      console.error('Error in AI analysis:', aiError);
      analysis = { 
        error: true, 
        message: 'AI analysis failed',
        details: aiError.message
      };
    }
    
    // Send response using our helper function
    return sendApiResponse(res, { analysis });
  } catch (error) {
    console.error('Error in SEO analysis endpoint:', error);
    // Send error response using our helper function
    return sendApiResponse(res, { 
      error: true, 
      message: 'Failed to analyze SEO data',
      details: error.message
    }, 500);
  }
});

// Get keyword suggestions
router.post('/suggest-keywords', auth, async (req, res) => {
  try {
    const { title, description, industry, metaKeywords } = req.body;
    
    const prompt = `
    As an SEO specialist, suggest relevant keywords for a website with:
    
    Title: ${title || 'N/A'}
    Description: ${description || 'N/A'}
    Industry: ${industry || 'General'}
    Existing Keywords: ${metaKeywords || 'None provided'}
    
    Provide the following in JSON format:
    1. "primary_keywords" array with 5-7 suggestions (improve or complement existing if possible)
    2. "secondary_keywords" array with 8-10 suggestions (improve or complement existing if possible)
    3. "long_tail_keywords" array with 5-7 suggestions (improve or complement existing if possible)
    
    Each keyword object should have:
    - "keyword": the actual keyword text
    - "difficulty_score": number from 1-100
    - "search_volume": "Low", "Medium", or "High"
    
    Consider the existing keywords when making suggestions. Aim to enhance the current keyword strategy.
    Format your response as valid, parseable JSON only.
    `;
    
    let keywords;
    try {
      // Use retry mechanism without timeout
      const makeAIRequest = async () => {
        const result = await model.generateContent(prompt);
        return result;
      };
      
      // Attempt the call with retries
      const result = await retryWithBackoff(makeAIRequest);
      const response = await result.response;
      const text = response.text();
      
      try {
        // Use the safe JSON parse helper
        keywords = safeJsonParse(text);
      } catch (parseError) {
        console.error('Error parsing keyword suggestions:', parseError);
        keywords = { 
          primary_keywords: [],
          secondary_keywords: [],
          long_tail_keywords: [],
          error: false, 
          rawResponse: text,
          message: 'Received non-JSON response from AI' 
        };
      }
    } catch (aiError) {
      console.error('Error generating content with AI:', aiError);
      keywords = { 
        primary_keywords: [],
        secondary_keywords: [],
        long_tail_keywords: [],
        error: true, 
        message: 'Error generating keywords with AI',
        details: aiError.message 
      };
    }
    
    // Send response using our helper function
    return sendApiResponse(res, { keywords });
  } catch (error) {
    console.error('Error in suggest-keywords endpoint:', error);
    // Send error response using our helper function
    return sendApiResponse(res, { 
      error: true, 
      message: 'Failed to suggest keywords',
      details: error.message
    }, 500);
  }
});

// Get content optimization suggestions - THIS ROUTE IS NOW OBSOLETE
/* // This route is no longer needed as its functionality is merged into /analyze
router.post('/optimize-content', auth, async (req, res) => {
// ... (commented out existing code) ...
});
*/

module.exports = router; 