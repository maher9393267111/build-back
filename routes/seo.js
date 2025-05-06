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
 'AIzaSyAg2bGH7Unh701ftOV1VDkM32S0Uc20cdM';

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
    
    // Handle HTML tags in suggestedHeadingStructure - Keep this specific cleaning if needed elsewhere
    // Consider moving this to the specific normalization function if only needed there
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
    console.log("Cleaned JSON string before parsing:", jsonStr);
    
    // Try straightforward parsing first
    try {
      const parsed = JSON.parse(jsonStr);
      // REMOVED: normalizeResponseData(parsed); - Normalization will happen in the route handlers
      return parsed; // Return the raw parsed object
    } catch (e) {
      console.log('Initial JSON parsing failed, trying with more cleaning...', e.message);
      // Log the full problematic string for debugging
      console.log("Problematic JSON:", jsonStr);
      
      // Replace single quotes with double quotes (common AI mistake)
      jsonStr = jsonStr.replace(/'/g, '"');
      
      // Handle potential HTML tags in suggestions - Keep general cleaning
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
      // REMOVED: normalizeResponseData(parsed); - Normalization will happen in the route handlers
      return parsed; // Return the raw parsed object
    }
  } catch (error) {
    console.error('Error safely parsing JSON:', error);
    // Re-throwing allows the calling route handler to catch it
    throw new Error(`Failed to parse JSON: ${error.message}. Original text: ${text.substring(0, 200)}...`); 
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

// Helper function to normalize blog-specific response data
function normalizeBlogResponseData(data) {
  // Start with the standard normalized data
  const normalized = normalizeResponseData(data);
  
  // Add blog-specific fields with appropriate defaults
  return {
    ...normalized,
    blogTitleSuggestions: Array.isArray(data.blogTitleSuggestions) ? data.blogTitleSuggestions : [],
    introductionSuggestions: Array.isArray(data.introductionSuggestions) ? data.introductionSuggestions : [],
    conclusionSuggestions: Array.isArray(data.conclusionSuggestions) ? data.conclusionSuggestions : [],
    blogOutlineStructure: Array.isArray(data.blogOutlineStructure) ? data.blogOutlineStructure : [],
    engagementTips: Array.isArray(data.engagementTips) ? data.engagementTips : [],
    readingTimeEstimate: typeof data.readingTimeEstimate === 'number' ? data.readingTimeEstimate : 0,
    categoryRelevance: typeof data.categoryRelevance === 'number' ? data.categoryRelevance : 0,
    targetAudience: typeof data.targetAudience === 'string' ? data.targetAudience : "No target audience analysis available",
    searchIntent: typeof data.searchIntent === 'string' ? data.searchIntent : "No search intent analysis available",
  };
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
    As an experienced SEO specialist with years of hands-on experience, thoroughly analyze and provide actionable recommendations for this page:

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

// Helper function to analyze Blog SEO data with Gemini
async function analyzeBlogWithGemini(blogData, content, requestContentSuggestions = false) {
  try {
    // Prepare the comprehensive content for analysis
    const prompt = `
    As a seasoned SEO and content strategist who has helped countless blogs rank on the first page of Google, provide a detailed analysis and actionable recommendations for this blog post:

    **Blog Metadata:**
    Title: ${blogData.title || 'N/A'}
    Meta Title: ${blogData.metaTitle || blogData.title || 'N/A'}
    Meta Description: ${blogData.description || 'N/A'}
    Meta Keywords: ${blogData.metaKeywords || 'N/A'}
    Category: ${blogData.category || 'N/A'}
    Slug: ${blogData.slug || 'N/A'}
    Canonical URL: ${blogData.canonicalUrl || 'N/A'}
    Robots: ${blogData.robots || 'index, follow'}
    OG Image: ${blogData.ogImage ? 'Present' : 'Missing'}

    **Blog Content:**
    ${content || 'No content provided for analysis.'}

    ${requestContentSuggestions ? 'Also provide nuanced content suggestions and improvements that read like they were written by an experienced content marketer.' : ''}

    Provide the following in a single, valid JSON format:

    **Overall Blog SEO Analysis:**
    1. "seoScore": number from 0-100 (overall blog SEO)
    2. "titleScore": number from 0-100
    3. "titleAnalysis": string with analysis of blog title
    4. "titleSuggestions": array of blog title suggestions
    5. "metaDescriptionScore": number from 0-100
    6. "metaDescriptionAnalysis": string with analysis
    7. "metaDescriptionSuggestions": array of suggestions
    8. "keywordsScore": number from 0-100 (based on meta keywords)
    9. "keywordsAnalysis": string with analysis
    10. "recommendedKeywords": array of keywords (overall suggestions)
    11. "urlStructureScore": number from 0-100
    12. "urlStructureAnalysis": string with analysis
    13. "contentStructureScore": number from 0-100 (based on headings, organization)
    14. "contentStructureRecommendations": string with recommendations
    15. "additionalRecommendations": array of general blog SEO recommendations

    **Blog Content Optimization Analysis:**
    16. "contentScore": number from 0-100 (based on provided text content)
    17. "keywordDensity": object with "analysis" string and "keywords" array of objects with "keyword" and "density" properties
    18. "readabilityScore": number from 0-100 (Flesch-Kincaid or similar)
    19. "contentImprovementSuggestions": array of specific suggestions for improving the blog
    20. "suggestedHeadingStructure": array of heading suggestions (e.g. ["H1: Main title", "H2: First section", etc.])
    21. "recommendedContentLength": recommended word count for this blog topic
    22. "readingTimeEstimate": estimated reading time in minutes
    23. "categoryRelevance": number from 0-100 indicating how well the content matches its category
    24. "targetAudience": string describing the likely target audience for this content
    25. "searchIntent": string analyzing the search intent this article would satisfy

    **Blog-Specific Content Enhancement:**
    26. "blogTitleSuggestions": array of 5 catchy alternative blog titles
    27. "introductionSuggestions": array of suggestions to improve the intro paragraph
    28. "conclusionSuggestions": array of suggestions to improve the conclusion
    29. "blogOutlineStructure": array of suggested sections for a well-structured blog on this topic
    30. "engagementTips": array of tips to make the content more engaging

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
      console.log("BLOG SEO RESPONSE ---", text);
      
      try {
        // Use the safe JSON parse helper
        responseData = safeJsonParse(text);
        // Use blog-specific normalization for additional fields
        responseData = normalizeBlogResponseData(responseData);
      } catch (parseError) {
        // If parsing fails, return a structured response
        console.error('Error parsing Gemini blog analysis response:', parseError);
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
          // Blog-specific fields
          blogTitleSuggestions: [],
          introductionSuggestions: [],
          conclusionSuggestions: [],
          blogOutlineStructure: [],
          engagementTips: [],
          readingTimeEstimate: 0,
          categoryRelevance: 0,
          targetAudience: "Analysis Error",
          searchIntent: "Analysis Error",
          error: true, 
          rawResponse: text,
          message: 'Received non-JSON response from AI' 
        };
      }
    } catch (aiError) {
      console.error('Error generating blog analysis with AI:', aiError);
      responseData = {
        seoScore: 0,
        error: true,
        message: 'Error generating blog SEO analysis with AI',
        details: aiError.message
      };
    }
    
    return responseData;
  } catch (error) {
    console.error('Error in analyzeBlogWithGemini:', error);
    return { 
      seoScore: 0,
      error: true, 
      message: error.message || 'Failed to analyze blog with Gemini' 
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
      const rawAnalysis = await analyzeWithGemini(pageData, content);
      // Apply normalization here
      if (rawAnalysis && !rawAnalysis.error) {
         analysis = normalizeResponseData(rawAnalysis);
      } else {
         // Handle case where analyzeWithGemini returned an error structure
         analysis = rawAnalysis; 
      }

    } catch (aiError) {
      console.error('Error in AI analysis step:', aiError);
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

// Endpoint to analyze SEO for a blog post
router.post('/analyze-blog', auth, async (req, res) => {
  try {
    const { blogData, content, requestContentSuggestions } = req.body;
    
    // Ensure blogData exists
    if (!blogData) {
      return sendApiResponse(res, { error: true, message: 'Missing blogData in request body' }, 400);
    }
    
    let analysis;
    try {
      // Pass blogData and content to the specialized blog analysis function
      const rawAnalysis = await analyzeBlogWithGemini(blogData, content, requestContentSuggestions);
      // Apply blog-specific normalization here
      if (rawAnalysis && !rawAnalysis.error) {
         analysis = normalizeBlogResponseData(rawAnalysis);
      } else {
         // Handle case where analyzeBlogWithGemini returned an error structure
         analysis = rawAnalysis;
      }
    } catch (aiError) {
      console.error('Error in AI blog analysis step:', aiError);
      analysis = { 
        error: true, 
        message: 'AI blog analysis failed',
        details: aiError.message
      };
    }
    
    // Send response using our helper function
    return sendApiResponse(res, { analysis });
  } catch (error) {
    console.error('Error in blog SEO analysis endpoint:', error);
    // Send error response using our helper function
    return sendApiResponse(res, { 
      error: true, 
      message: 'Failed to analyze blog SEO data',
      details: error.message
    }, 500);
  }
});

// Get keyword suggestions
router.post('/suggest-keywords', auth, async (req, res) => {
  try {
    const { title, description, industry, metaKeywords, contentType } = req.body;
    
    const prompt = `
    Drawing from my 10+ years of SEO keyword research experience, I'll suggest high-impact keywords for:

    Title: ${title || 'N/A'}
    Description: ${description || 'N/A'}
    Industry: ${industry || 'General'}
    Content Type: ${contentType || 'General'}
    Existing Keywords: ${metaKeywords || 'None provided'}

    Provide the following in JSON format:
    1. "primary_keywords" array with 5-7 suggestions (naturally complementing any existing keywords)
    2. "secondary_keywords" array with 8-10 suggestions (targeting related search intent)
    3. "long_tail_keywords" array with 5-7 suggestions (conversational phrases real people search for)

    Each keyword object should have:
    - "keyword": the actual keyword text
    - "difficulty_score": number from 1-100
    - "search_volume": "Low", "Medium", or "High"

    ${contentType === 'article' || contentType === 'blog' ? 'Focus on natural, human-sounding phrases that would work in conversational blog content and match genuine search intent.' : ''}
    Avoid artificially constructed keywords that sound robotic. Prioritize terms that actual people would type or speak when searching.
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
      console.log("KEYWORDS RESPONSE ---", text); // Log raw AI response

      try {
        // Use the safe JSON parse helper - It now returns raw parsed data
        keywords = safeJsonParse(text); 
        // No normalization needed here, keywords should have the correct structure
        
        // Add a check for the expected structure (optional but good practice)
        if (!keywords || !Array.isArray(keywords.primary_keywords)) {
          console.warn('Parsed keyword data does not have the expected structure:', keywords);
          // Fallback or throw specific error if needed
          throw new Error('AI response did not contain the expected keyword structure.');
        }

      } catch (parseError) {
        console.error('Error parsing keyword suggestions:', parseError);
        // Return a more informative error structure
        return sendApiResponse(res, { 
          error: true, 
          message: `Failed to parse keyword suggestions from AI: ${parseError.message}`,
          rawResponse: text // Include raw response for debugging
        }, 500);
      }
    } catch (aiError) {
      console.error('Error generating keywords with AI:', aiError);
       // Return error structure
       return sendApiResponse(res, {
         error: true, 
         message: 'Error generating keywords with AI',
         details: aiError.message 
       }, 500);
    }
    
    // Send response using our helper function - 'keywords' now holds the correctly parsed object
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

// Endpoint to get specific blog content suggestions
router.post('/blog-content-suggestions', auth, async (req, res) => {
  try {
    const { blogData, content } = req.body;
    
    // Ensure required data exists
    if (!blogData || !content) {
      return sendApiResponse(res, { 
        error: true, 
        message: 'Missing required data in request body' 
      }, 400);
    }
    
    // Build prompt for blog content suggestions
    const prompt = `
    As a professional content writer with 8+ years experience crafting viral blog content, analyze this blog and provide suggestions that sound like they came from a seasoned editor:

    **Blog Title:** ${blogData.title || 'N/A'}
    **Category:** ${blogData.category || 'N/A'}
    **Target Keywords:** ${blogData.metaKeywords || 'N/A'}

    **Current Content:**
    ${content}

    Provide the following in a valid JSON format:

    1. "contentSuggestions": {
       "sections": array of objects with suggested sections to include (each with "title" and "description"),
       "improvements": array of specific content improvement suggestions,
       "examples": array of objects with example snippets (each with "title" and "content"),
       "outline": suggested blog outline as an array of section headings,
       "introIdeas": array of introduction paragraph ideas that hook readers immediately,
       "conclusionIdeas": array of conclusion paragraph ideas that leave lasting impressions,
       "ctaIdeas": array of natural call-to-action suggestions that don't feel forced,
       "headingStructure": suggested heading structure as an array of strings (e.g., "H1: Title", "H2: Section 1", etc.)
    }

    Format your response as valid, parseable JSON only. Ensure the root object contains only the "contentSuggestions" key.
    `;
    
    let contentSuggestions;
    try {
      // Use retry mechanism
      const makeAIRequest = async () => {
        const result = await model.generateContent(prompt);
        return result;
      };
      
      // Attempt the call with retries
      const result = await retryWithBackoff(makeAIRequest);
      const response = await result.response;
      const text = response.text();
      console.log("BLOG CONTENT SUGGESTIONS RESPONSE ---", text); // Log raw response

      try {
        // Parse the raw JSON response
        const parsed = safeJsonParse(text);
        // Extract the specific part needed
        if (parsed && parsed.contentSuggestions) {
          contentSuggestions = parsed.contentSuggestions;
        } else {
           console.warn('Parsed blog content data does not have the expected structure:', parsed);
           throw new Error('AI response did not contain the expected contentSuggestions structure.');
        }
      } catch (parseError) {
         console.error('Error parsing blog content suggestions:', parseError);
         return sendApiResponse(res, { 
           error: true, 
           message: `Failed to parse blog content suggestions from AI: ${parseError.message}`,
           rawResponse: text
         }, 500);
      }
    } catch (aiError) {
      console.error('Error generating blog content suggestions with AI:', aiError);
       return sendApiResponse(res, { 
         error: true, 
         message: 'Error generating blog content suggestions',
         details: aiError.message 
       }, 500);
    }
    
    // Send response using our helper function
    return sendApiResponse(res, { contentSuggestions }); 
  } catch (error) {
    console.error('Error in blog-content-suggestions endpoint:', error);
    return sendApiResponse(res, { 
      error: true, 
      message: 'Failed to generate blog content suggestions',
      details: error.message
    }, 500);
  }
});

// Generate blog content with Gemini AI
async function generateBlogContentWithGemini(params) {
  try {
    const {
      title,
      description,
      keywords,
      category,
      contentType = 'full',
      tone = 'professional',
      customPrompt,
      existingContent
    } = params;
    
    // Build a comprehensive prompt for high-quality SEO content
    let prompt = `
    You are a veteran content writer who has published hundreds of popular articles for leading publications. You excel at creating content that reads naturally, varies sentence structure, and engages readers through storytelling.

    Generate ${contentType === 'full' ? 'a complete blog article' : contentType === 'intro' ? 'an engaging introduction' : contentType === 'conclusion' ? 'a powerful conclusion' : 'a detailed section'} with the following details:

    TITLE: ${title}
    ${description ? `DESCRIPTION/SUMMARY: ${description}` : ''}
    ${keywords ? `KEYWORDS: ${keywords}` : ''}
    ${category ? `CATEGORY: ${category}` : ''}
    TONE: ${tone}
    ${customPrompt ? `ADDITIONAL INSTRUCTIONS: ${customPrompt}` : ''}
    ${existingContent ? `EXISTING CONTENT TO CONSIDER: ${existingContent}` : ''}

    CONTENT REQUIREMENTS:
    1. Create structured content with proper H2, H3 headings (using <h2>, <h3> HTML tags)
    2. Include numbered or bulleted lists where appropriate (using <ul>, <ol>, <li> HTML tags)
    3. Incorporate keywords naturally - never forcing them where they don't belong
    4. Include specific examples, personal anecdotes, or case studies with real numbers
    5. Write in a ${tone} tone with a natural human voice
    6. Vary sentence length and structure - mix short punchy sentences with longer descriptive ones
    7. Use first-person perspective occasionally ("I've found that..." or "In my experience...")
    8. Include occasional imperfections like contractions, sentence fragments, or parenthetical asides
    9. Avoid perfectly balanced paragraph lengths - humans don't write that way
    10. Include natural transitions between paragraphs and occasional rhetorical questions
    11. Write with personality, occasional humor, and conversational phrases 
    12. Emphasize key points with <strong> tags (but sparingly)
    13. Use industry jargon where appropriate but explain complex concepts simply
    14. Include thoughtful takeaways and actionable advice

    Strictly output ONLY the raw HTML formatted blog content requested, without any surrounding text, explanations, markdown formatting (like \`\`\`html ... \`\`\`), or JSON wrappers.
    `;
    
    // Adjust prompt based on content type
    if (contentType === 'intro') {
      prompt += `
      For the introduction:
      - Create a compelling hook
      - Introduce the problem/topic clearly
      - Tease what the reader will learn
      - Keep it under 250 words
      - End with a transition to the main content
      `;
    } else if (contentType === 'conclusion') {
      prompt += `
      For the conclusion:
      - Summarize key points
      - Provide clear takeaways
      - Include a call-to-action
      - Encourage sharing or comments
      - Keep it under 250 words
      `;
    } else if (contentType === 'section') {
      prompt += `
      For the blog section:
      - Include an H2 heading related to the topic
      - Write 300-500 words on this specific aspect
      - Include specific examples or data points
      - Make it standalone but connectable to a larger article
      `;
    }
    
    // Generate content with Gemini
    try {
      // Use retry mechanism without timeout
      const makeAIRequest = async () => {
        const result = await model.generateContent(prompt);
        return result;
      };
      
      // Attempt the call with retries
      const result = await retryWithBackoff(makeAIRequest);
      const response = await result.response;
      let text = response.text(); // Get raw text

      // ---- START CLEANING LOGIC ----
      try {
        // Remove potential markdown code blocks first
        const codeBlockMatch = text.match(/```(?:\w*\n)?([\s\S]*?)```/);
        if (codeBlockMatch && codeBlockMatch[1]) {
          console.log("Detected markdown code block, extracting content...");
          text = codeBlockMatch[1].trim();
        }
        
        // Check if the (potentially extracted) content looks like the specific JSON structure
        const trimmedText = text.trim();
        if (trimmedText.startsWith('{"html_content":') && trimmedText.endsWith('}')) {
          console.log("Detected JSON wrapper, attempting to extract html_content...");
          const parsedJson = JSON.parse(trimmedText);
          if (parsedJson.html_content) {
            text = parsedJson.html_content;
            console.log("Successfully extracted html_content.");
          } else {
            console.warn("JSON structure detected, but html_content key is missing.");
          }
        }
      } catch (e) {
        console.warn("Error during response cleaning/parsing, using text as is (after potential code block removal):", e.message);
        // Keep the potentially code-block-extracted text if JSON parsing fails
      }
      text = text.trim(); // Trim final result
      // ---- END CLEANING LOGIC ----
      
      return {
        success: true,
        generatedContent: text // Return the potentially cleaned text
      };
    } catch (aiError) {
      console.error('Error generating blog content with AI:', aiError);
      return {
        success: false,
        error: true,
        message: 'Error generating blog content with AI',
        details: aiError.message
      };
    }
  } catch (error) {
    console.error('Error in generateBlogContentWithGemini:', error);
    return { 
      success: false,
      error: true, 
      message: error.message || 'Failed to generate blog content' 
    };
  }
}

// Blog content generation endpoint
router.post('/generate-blog-content', auth, async (req, res) => {
  try {
    const params = req.body;
    
    // Validate required parameters
    if (!params.title) {
      return sendApiResponse(res, { 
        error: true, 
        message: 'Title is required for content generation' 
      }, 400);
    }
    
    // Generate content with Gemini
    const result = await generateBlogContentWithGemini(params);
    
    if (result.success) {
      return sendApiResponse(res, { 
        success: true,
        generatedContent: result.generatedContent
      });
    } else {
      return sendApiResponse(res, { 
        error: true, 
        message: result.message || 'Failed to generate blog content',
        details: result.details
      }, 500);
    }
  } catch (error) {
    console.error('Error generating blog content:', error);
    return sendApiResponse(res, { 
      error: true, 
      message: 'Failed to generate blog content',
      details: error.message
    }, 500);
  }
});

// Generate blog outline with Gemini AI
async function generateBlogOutlineWithGemini(params) {
  try {
    const {
      title,
      category,
      keywords,
      targetAudience = 'general',
      existingContent
    } = params;
    
    // Build a comprehensive prompt for blog outlining
    const prompt = `
    As a veteran content strategist who has developed content plans for major publications, create a detailed, SEO-optimized outline for a blog post that will actually engage real human readers:

    BLOG TITLE: ${title}
    ${category ? `CATEGORY: ${category}` : ''}
    ${keywords ? `TARGET KEYWORDS: ${keywords}` : ''}
    TARGET AUDIENCE: ${targetAudience}
    ${existingContent ? `EXISTING CONTENT TO CONSIDER: ${existingContent}` : ''}

    Provide a comprehensive blog outline that includes:

    1. A compelling, click-worthy title (possibly improving on the one provided)
    2. Recommended word count target
    3. Estimated reading time
    4. An introduction structure that hooks readers immediately
    5. Main sections (H2 headings) that follow a natural narrative arc
    6. For each main section, include:
       - A headline that would actually make someone want to read it
       - Brief description of what to cover
       - Key points that include specific examples, stories or data points
       - Relevant subsections (H3 headings) that break complex ideas down
    7. A conclusion structure that reinforces key points and provides closure
    8. 3-5 FAQs that address genuine reader questions (with brief answers)
    9. SEO tips specific to this content that don't sacrifice readability

    Return the outline in a valid JSON format with these keys:
    {
      "title": "Suggested blog title",
      "wordCountTarget": "Recommended word count range",
      "estimatedReadingTime": "Estimated reading time in minutes",
      "introduction": "Brief description of what to cover in intro",
      "sections": [
        {
          "heading": "H2 heading",
          "description": "What to cover in this section",
          "keypoints": ["key point 1", "key point 2", ...],
          "subheadings": ["H3 subheading 1", "H3 subheading 2", ...]
        }
      ],
      "conclusion": "Brief description of what to cover in conclusion",
      "faqs": [
        {
          "question": "FAQ question",
          "answer": "Brief answer"
        }
      ],
      "seoTips": ["SEO tip 1", "SEO tip 2", ...]
    }

    The outline should feel like it was created by a human editor with a deep understanding of both SEO and storytelling.
    `;
    
    // Generate outline with Gemini
    try {
      // Use retry mechanism
      const makeAIRequest = async () => {
        const result = await model.generateContent(prompt);
        return result;
      };
      
      // Attempt the call with retries
      const result = await retryWithBackoff(makeAIRequest);
      const response = await result.response;
      const text = response.text();
      
      // Parse the response as JSON
      try {
        const outlineData = safeJsonParse(text);
        return {
          success: true,
          outline: outlineData
        };
      } catch (parseError) {
        console.error('Error parsing blog outline JSON:', parseError);
        return {
          success: false,
          error: true,
          message: 'Failed to parse blog outline response',
          details: parseError.message,
          rawResponse: text
        };
      }
    } catch (aiError) {
      console.error('Error generating blog outline with AI:', aiError);
      return {
        success: false,
        error: true,
        message: 'Error generating blog outline with AI',
        details: aiError.message
      };
    }
  } catch (error) {
    console.error('Error in generateBlogOutlineWithGemini:', error);
    return { 
      success: false,
      error: true, 
      message: error.message || 'Failed to generate blog outline' 
    };
  }
}

// Blog outline generation endpoint
router.post('/generate-blog-outline', auth, async (req, res) => {
  try {
    const params = req.body;
    
    // Validate required parameters
    if (!params.title) {
      return sendApiResponse(res, { 
        error: true, 
        message: 'Title is required for outline generation' 
      }, 400);
    }
    
    // Generate outline with Gemini
    const result = await generateBlogOutlineWithGemini(params);
    
    if (result.success) {
      return sendApiResponse(res, { 
        success: true,
        outline: result.outline
      });
    } else {
      return sendApiResponse(res, { 
        error: true, 
        message: result.message || 'Failed to generate blog outline',
        details: result.details
      }, 500);
    }
  } catch (error) {
    console.error('Error generating blog outline:', error);
    return sendApiResponse(res, { 
      error: true, 
      message: 'Failed to generate blog outline',
      details: error.message
    }, 500);
  }
});

module.exports = router; 