// frontend/services/api.js
import axios from 'axios';
import { Platform } from 'react-native';

// ========================================
// CONFIGURATION
// ========================================
// For WEB: Use localhost
// For MOBILE: Use your computer's IP address
// 
// To find your IP:
// - Windows: Open CMD, run: ipconfig
// - Mac/Linux: Open Terminal, run: ifconfig
// - Look for IPv4 address (e.g., 192.168.1.100)
// ========================================
// 'http://localhost:3001/api';
const API_BASE_URL = 'https://food-snowy-six.vercel.app/api';

// For mobile testing, uncomment and update this:
// const API_BASE_URL = 'http://192.168.1.XXX:3001/api';

// ========================================
// API FUNCTIONS
// ========================================

/**
 * Analyze product images using Google Vision AI
 * @param {Array} imageFiles - Array of File objects (web) or image objects with uri, type, name (mobile)
 * @returns {Promise} Response with extracted product data
 */
export const analyzeImages = async (imageFiles) => {
  try {
    console.log('analyzeImages called with', imageFiles.length, 'files');
    console.log('Platform:', Platform.OS);

    const formData = new FormData();

    if (Platform.OS === 'web') {
      // Web: imageFiles are already File objects from the blob conversion
      imageFiles.forEach((file, index) => {
        console.log(`Appending file ${index}:`, file.name, file.type, file.size);
        formData.append('images', file);
      });
    } else {
      // Mobile: Use URI with proper structure
      imageFiles.forEach((file, index) => {
        console.log(`Appending mobile file ${index}:`, file.uri);
        formData.append('images', {
          uri: file.uri,
          type: file.type || 'image/jpeg',
          name: file.name || `photo_${index}.jpg`,
        });
      });
    }

    console.log('Sending request to:', `${API_BASE_URL}/analyze`);

    const response = await axios.post(`${API_BASE_URL}/analyze`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000, // 60 second timeout for image processing
    });

    console.log('Analysis response received:', response.data);
    return response.data;
  } catch (error) {
    console.error('analyzeImages error:', error);
    if (error.response) {
      console.error('Error response data:', error.response.data);
      console.error('Error response status:', error.response.status);
    }
    throw error;
  }
};

/**
 * Generate recipe suggestions from ingredients
 * @param {Array} ingredients - Array of ingredient names
 * @param {Array} customIngredients - Optional custom ingredient names
 * @returns {Promise} Response with recipe suggestions
 */
export const generateRecipes = async (ingredients, customIngredients = []) => {
  try {
    console.log('Generating recipes with ingredients:', ingredients);
    
    const response = await axios.post(`${API_BASE_URL}/recipe/generate`, {
      ingredients,
      customIngredients
    }, {
      timeout: 30000,
    });

    return response.data;
  } catch (error) {
    console.error('generateRecipes error:', error);
    if (error.response) {
      console.error('Error response:', error.response.data);
    }
    throw error;
  }
};

/**
 * Get detailed recipe instructions
 * @param {string} recipeName - Name of the recipe
 * @param {Array} ingredients - Array of ingredient names
 * @returns {Promise} Response with detailed recipe
 */
export const getRecipeDetails = async (recipeName, ingredients) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/recipe/details`, {
      recipeName,
      ingredients
    }, {
      timeout: 30000,
    });

    return response.data;
  } catch (error) {
    console.error('getRecipeDetails error:', error);
    throw error;
  }
};

/**
 * Get health rating analysis for product
 * @param {Array} ingredients - Array of ingredient names
 * @param {string} productName - Name of the product
 * @returns {Promise} Response with health rating analysis
 */
export const rateProduct = async (ingredients, productName = '') => {
  try {
    console.log('Rating product:', productName, 'with', ingredients.length, 'ingredients');
    
    const response = await axios.post(`${API_BASE_URL}/rating/analyze`, {
      ingredients,
      productName
    }, {
      timeout: 30000,
    });

    return response.data;
  } catch (error) {
    console.error('rateProduct error:', error);
    if (error.response) {
      console.error('Error response:', error.response.data);
    }
    throw error;
  }
};

/**
 * Batch analyze multiple products
 * @param {Array} products - Array of product objects with ingredients
 * @returns {Promise} Response with batch analysis results
 */
export const batchRateProducts = async (products) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/rating/batch`, {
      products
    }, {
      timeout: 60000, // Longer timeout for batch processing
    });

    return response.data;
  } catch (error) {
    console.error('batchRateProducts error:', error);
    throw error;
  }
};

/**
 * Check backend server health
 * @returns {Promise} Response with server status
 */
export const checkBackendHealth = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL.replace('/api', '')}/health`, {
      timeout: 5000,
    });

    return response.data;
  } catch (error) {
    console.error('checkBackendHealth error:', error);
    throw error;
  }
};

// Export base URL for debugging
export const getBaseURL = () => API_BASE_URL;