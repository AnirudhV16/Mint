import axios from 'axios';
import { Platform } from 'react-native';

// backend
const API_BASE_URL = 'https://food-snowy-six.vercel.app/api';


export const analyzeImages = async (imageFiles) => {
  try {
    console.log('analyzeImages called with', imageFiles.length, 'files');
    console.log('Platform:', Platform.OS);

    const formData = new FormData();

    if (Platform.OS === 'web') {
      
      imageFiles.forEach((file, index) => {
        console.log(`Appending file ${index}:`, file.name, file.type, file.size);
        formData.append('images', file);
      });
    } else {
      
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
      timeout: 60000,
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


export const batchRateProducts = async (products) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/rating/batch`, {
      products
    }, {
      timeout: 60000, 
    });

    return response.data;
  } catch (error) {
    console.error('batchRateProducts error:', error);
    throw error;
  }
};


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

export const getBaseURL = () => API_BASE_URL;