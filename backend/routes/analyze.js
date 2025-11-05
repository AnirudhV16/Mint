const express = require('express');
const router = express.Router();
const multer = require('multer');
const vision = require('@google-cloud/vision');
const { GoogleGenerativeAI } = require('@google/generative-ai');


const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {

    // Accept images only
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image files are allowed!'), false);
      return;
    }
    cb(null, true);
  }
});

// Initialize Google Vision client
let visionClient;
try {
  
  if (!process.env.GOOGLE_CLOUD_PROJECT_ID || 
      !process.env.GOOGLE_CLOUD_PRIVATE_KEY || 
      !process.env.GOOGLE_CLOUD_CLIENT_EMAIL) {
    throw new Error('Missing required Google Cloud environment variables');
  }

  const credentials = {
    type: "service_account",
    project_id: process.env.GOOGLE_CLOUD_PROJECT_ID,
    private_key_id: process.env.GOOGLE_CLOUD_PRIVATE_KEY_ID,
    private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
    client_id: process.env.GOOGLE_CLOUD_CLIENT_ID,
    auth_uri: process.env.GOOGLE_CLOUD_AUTH_URI || "https://accounts.google.com/o/oauth2/auth",
    token_uri: process.env.GOOGLE_CLOUD_TOKEN_URI || "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: process.env.GOOGLE_CLOUD_AUTH_PROVIDER_CERT_URL || "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.GOOGLE_CLOUD_CLIENT_CERT_URL
  };

  visionClient = new vision.ImageAnnotatorClient({
    credentials: credentials,
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
  });
  
  console.log(' Google Vision API client initialized from environment variables');
  console.log('   Project ID:', process.env.GOOGLE_CLOUD_PROJECT_ID);
} catch (error) {
  console.error(' Failed to initialize Vision API:', error.message);
  console.error('   Make sure all GOOGLE_CLOUD_* environment variables are set in .env');
}

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// POST /api/analyze - Analyze product images
router.post('/', upload.array('images', 4), async (req, res) => {
  console.log('\n=== ANALYZE REQUEST ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Files received:', req.files?.length || 0);
  
  try {
    // 1. Validate Vision client
    if (!visionClient) {
      console.error(' Vision API client not initialized');
      return res.status(500).json({
        error: 'Vision API not configured',
        message: 'Google Cloud Vision API is not properly configured. Check environment variables and server logs.'
      });
    }

    // 2. Validate files
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        error: 'No images provided',
        message: 'Please upload at least one image'
      });
    }

    // 3. Log file details
    req.files.forEach((file, i) => {
      console.log(`File ${i + 1}:`, {
        name: file.originalname,
        type: file.mimetype,
        size: `${(file.size / 1024).toFixed(2)} KB`,
        buffer: file.buffer ? `${file.buffer.length} bytes` : 'missing'
      });
    });

    console.log(`\n📸 Processing ${req.files.length} image(s)...`);
    const startTime = Date.now();

    const allText = [];
    const imageAnalysis = [];

    // 4. Process each image with Vision API
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      console.log(`\n[Image ${i + 1}/${req.files.length}]`);

      try {
        if (!file.buffer || file.buffer.length === 0) {
          console.error(`  Empty buffer for file ${i + 1}`);
          imageAnalysis.push({
            imageIndex: i,
            textFound: false,
            error: 'Empty image buffer'
          });
          continue;
        }

        
        // Call Vision API
        const [result] = await visionClient.textDetection({
          image: { 
            content: file.buffer.toString('base64') 
          }
        });

        console.log(`  Vision API response received`);

        // Check for API errors
        if (result.error) {
          console.error(` Vision API error:`, result.error.message);
          imageAnalysis.push({
            imageIndex: i,
            textFound: false,
            error: result.error.message
          });
          continue;
        }

        const detections = result.textAnnotations;
        console.log(` Text annotations: ${detections?.length || 0}`);

        if (detections && detections.length > 0) {
          const text = detections[0].description;
          const wordCount = text.split(/\s+/).length;
          
          console.log(`  Text found: ${text.length} chars, ${wordCount} words`);
          console.log(`  Preview: "${text.substring(0, 80).replace(/\n/g, ' ')}..."`);
          
          allText.push(text);
          
          imageAnalysis.push({
            imageIndex: i,
            textFound: true,
            textLength: text.length,
            wordCount: wordCount,
            preview: text.substring(0, 150).replace(/\n/g, ' ') + '...'
          });
        } else {
          console.log(`  No text detected`);
          imageAnalysis.push({
            imageIndex: i,
            textFound: false,
            message: 'No text detected - ensure image shows clear text labels'
          });
        }

      } catch (ocrError) {
        console.error(` OCR error:`, ocrError.message);
        imageAnalysis.push({
          imageIndex: i,
          textFound: false,
          error: ocrError.message
        });
      }
    }

    const ocrTime = Date.now() - startTime;
    console.log(`\n⏱  OCR completed in ${ocrTime}ms`);

    // 5. Check if we got any text
    const combinedText = allText.filter(Boolean).join('\n\n');
    const successCount = allText.length;

    console.log(`Results: ${successCount}/${req.files.length} images had readable text`);
    console.log(`Total text: ${combinedText.length} characters`);

    if (!combinedText.trim()) {
      console.log(' No text found in any image');
      
      return res.status(400).json({
        error: 'No text found in images',
        message: 'Could not extract text from uploaded images. Please:\n• Take clear, well-lit photos\n• Focus on text/labels\n• Avoid blurry images\n• Try capturing nutrition labels or ingredient lists',
        imageAnalysis: imageAnalysis,
        debug: {
          filesReceived: req.files.length,
          filesWithText: successCount
        }
      });
    }

    // 6. Send to Gemini for structured extraction
    console.log('\n Extracting structured data with Gemini...');
    const aiStartTime = Date.now();

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `You are analyzing text extracted from an food product label. Extract structured information accurately.

TEXT FROM LABEL:
${combinedText}

Return ONLY a valid JSON object in this exact structure:
{
  "productName": "Product name (or null if not found)",
  "mfgDate": "YYYY-MM-DD format (or null)",
  "expDate": "YYYY-MM-DD format (or null)",
  "ingredients": ["ingredient1", "ingredient2", ...],
  "nutrition": {
    "calories": "value per serving",
    "protein": "value",
    "carbs": "value",
    "fat": "value"
  }
}

### Guidelines for date extraction:
- Indian labels often show dates like:
  • DD-MM-YYYY or DD/MM/YYYY  
  • MM-YYYY or MM/YYYY  
  • MFG: 05/2024 or EXP: 10/2025  
  • Best Before: 12 months from MFG
- Detect any valid manufacturing (MFG/MFD) and expiry (EXP/USE BY) dates.
- If the year has two digits, infer it as 20XX.
- Normalize every detected date to ISO format (YYYY-MM-DD).
  • Example: "15-06-2024" → "2024-06-15"
  • Example: "05/2024" → "2024-05-01"
  • Example: "MFD 10/23" → "2023-10-01"
- If no specific day is mentioned, assume the first day of the month.
- Use null when the date cannot be determined.

### Additional rules:
- Identify the product name (brand or main title).
- List ingredients as an array.
- Include key nutritional values (calories, protein, carbs, fat).
- Use null for missing information.
- Return ONLY valid JSON (no markdown or text outside the JSON).`;


    const result = await model.generateContent(prompt);
    const response = await result.response;
    let aiText = response.text();
    
    const aiTime = Date.now() - aiStartTime;
    console.log(`⚡ AI completed in ${aiTime}ms`);

    // Clean and parse AI response
    aiText = aiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    let productData;
    try {
      productData = JSON.parse(aiText);
      console.log(' Product data extracted:', {
        name: productData.productName,
        ingredients: productData.ingredients?.length || 0,
        hasDates: !!(productData.mfgDate || productData.expDate)
      });
    } catch (parseError) {
      console.error('  Could not parse AI response, using defaults');
      productData = {
        productName: combinedText.split('\n')[0].substring(0, 50),
        mfgDate: null,
        expDate: null,
        ingredients: [],
        nutrition: {}
      };
    }

    const totalTime = Date.now() - startTime;
    console.log(`\n Analysis complete in ${totalTime}ms\n`);

    res.json({
      success: true,
      data: productData,
      metadata: {
        imagesProcessed: req.files.length,
        imagesWithText: successCount,
        textExtracted: combinedText.length,
        imageAnalysis: imageAnalysis,
        ocrEngine: 'Google Cloud Vision API',
        timings: {
          ocrTime: `${ocrTime}ms`,
          aiTime: `${aiTime}ms`,
          totalTime: `${totalTime}ms`
        }
      },
      rawText: combinedText.substring(0, 500) + (combinedText.length > 500 ? '...' : '')
    });

  } catch (error) {
    console.error('\n CRITICAL ERROR:', error.message);
    console.error('Stack:', error.stack);
    
    res.status(500).json({ 
      error: 'Failed to analyze images', 
      details: error.message,
      message: 'Server error during image analysis. Check server logs for details.'
    });
  }
});

// Health check for Vision API
router.get('/test', async (req, res) => {
  try {
    if (!visionClient) {
      return res.status(500).json({
        status: 'error',
        message: 'Vision API client not initialized',
        hint: 'Check GOOGLE_CLOUD_* environment variables in .env file'
      });
    }

    res.json({
      status: 'ok',
      message: 'Vision API is configured',
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

module.exports = router;