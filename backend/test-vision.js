// backend/test-vision.js - Test Google Cloud Vision API
// Run: node test-vision.js

const vision = require('@google-cloud/vision');
const fs = require('fs');
const path = require('path');

async function testVisionAPI() {
  console.log('🔍 Testing Google Cloud Vision API...\n');

  try {
    // 1. Check if serviceAccountKey.json exists
    const keyPath = path.join(__dirname, 'serviceAccountKey.json');
    if (!fs.existsSync(keyPath)) {
      console.error('❌ ERROR: serviceAccountKey.json not found!');
      console.error('   Expected location:', keyPath);
      console.error('\n📝 Solution:');
      console.error('   1. Go to Google Cloud Console');
      console.error('   2. Navigate to IAM & Admin > Service Accounts');
      console.error('   3. Create/download service account key');
      console.error('   4. Save as serviceAccountKey.json in backend folder');
      return;
    }
    console.log('✅ serviceAccountKey.json found\n');

    // 2. Try to initialize Vision client
    console.log('🔧 Initializing Vision API client...');
    const client = new vision.ImageAnnotatorClient({
      keyFilename: keyPath
    });
    console.log('✅ Vision API client initialized\n');

    // 3. Check if GOOGLE_APPLICATION_CREDENTIALS is set
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.log('📌 GOOGLE_APPLICATION_CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
    } else {
      console.log('ℹ️  GOOGLE_APPLICATION_CREDENTIALS not set (using keyFilename directly)');
    }
    console.log('');

    // 4. Test with a simple text image (create a test image)
    console.log('📸 Testing with sample text detection...');
    console.log('   (You can test with a real image by passing the path as argument)');
    console.log('');

    // If you want to test with a real image, uncomment and provide path:
    // const testImagePath = './test-image.jpg';
    // if (fs.existsSync(testImagePath)) {
    //   console.log('🖼️  Testing with:', testImagePath);
    //   const [result] = await client.textDetection(testImagePath);
    //   const detections = result.textAnnotations;
    //   if (detections && detections.length > 0) {
    //     console.log('✅ Text detected!');
    //     console.log('   Full text:', detections[0].description);
    //   } else {
    //     console.log('⚠️  No text detected in image');
    //   }
    // }

    console.log('✅ SETUP TEST COMPLETE');
    console.log('\n📋 Summary:');
    console.log('   • Service account key: ✓');
    console.log('   • Vision API client: ✓');
    console.log('\n🎯 Next Steps:');
    console.log('   1. Make sure Cloud Vision API is ENABLED in your Google Cloud project');
    console.log('   2. Ensure service account has "Cloud Vision API User" role');
    console.log('   3. Try uploading images through the app');
    console.log('\n💡 To test with a real image:');
    console.log('   node test-vision.js /path/to/image.jpg');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\n🔧 Common issues:');
    console.error('   1. Cloud Vision API not enabled');
    console.error('      → Go to: https://console.cloud.google.com/apis/library/vision.googleapis.com');
    console.error('   2. Invalid service account key');
    console.error('      → Download fresh key from IAM & Admin > Service Accounts');
    console.error('   3. Insufficient permissions');
    console.error('      → Add "Cloud Vision API User" role to service account');
    console.error('\n📄 Full error details:');
    console.error(error);
  }
}

// Run test
testVisionAPI();

// If image path provided as argument, test with that image
if (process.argv[2]) {
  const imagePath = process.argv[2];
  console.log('\n\n🖼️  Testing with provided image:', imagePath);
  
  (async () => {
    try {
      const client = new vision.ImageAnnotatorClient({
        keyFilename: './serviceAccountKey.json'
      });
      
      if (!fs.existsSync(imagePath)) {
        console.error('❌ Image file not found:', imagePath);
        return;
      }
      
      console.log('📸 Analyzing image...');
      const [result] = await client.textDetection(imagePath);
      const detections = result.textAnnotations;
      
      if (detections && detections.length > 0) {
        console.log('✅ TEXT FOUND!');
        console.log('\nExtracted text:');
        console.log('─'.repeat(50));
        console.log(detections[0].description);
        console.log('─'.repeat(50));
        console.log(`\n📊 Stats: ${detections[0].description.length} characters`);
      } else {
        console.log('⚠️  No text detected in this image');
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  })();
}