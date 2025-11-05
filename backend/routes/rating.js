const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Analyze product health rating
router.post('/analyze', async (req, res) => {
  try {
    const { ingredients, productName } = req.body;

    if (!ingredients || ingredients.length === 0) {
      return res.status(400).json({ 
        error: 'No ingredients provided',
        message: 'Please provide ingredient list for analysis'
      });
    }

    const ingredientList = ingredients.join(', ');
    const product = productName || 'Food product';
    
    console.log(' Analyzing health rating for:', product);
    console.log('   Ingredients:', ingredientList);

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

    
    const prompt = `You are a nutrition expert. Analyze the health quality of a food product with these ingredients: ${ingredientList}

Evaluate and provide:
1. Health Rating (1-5 stars):
   - 5 stars: Very healthy, mostly natural, nutritious ingredients
   - 4 stars: Healthy with minor processed ingredients
   - 3 stars: Moderately healthy, some concerns
   - 2 stars: Several unhealthy ingredients
   - 1 star: Mostly unhealthy, many processed/harmful ingredients

2. Good Contents: List healthy/beneficial ingredients and nutrients
3. Bad Contents: List unhealthy/concerning ingredients (preservatives, artificial colors, excessive sugar/sodium, etc.)

Be specific and explain WHY ingredients are good or bad.

Return ONLY valid JSON with this exact structure:
{
  "rating": 3,
  "goodContents": [
    "Whole wheat (high fiber, complex carbs)",
    "Vitamin D (bone health)"
  ],
  "badContents": [
    "High sodium (680mg per serving)",
    "Artificial preservatives (BHA, BHT)"
  ],
  "summary": "Brief overall assessment in one sentence"
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    let analysis;
    try {
      analysis = JSON.parse(text);
      
      if (typeof analysis.rating !== 'number') {
        analysis.rating = 3;
      }
      analysis.rating = Math.max(1, Math.min(5, Math.round(analysis.rating)));
      
      if (!Array.isArray(analysis.goodContents)) {
        analysis.goodContents = [];
      }
      if (!Array.isArray(analysis.badContents)) {
        analysis.badContents = [];
      }
      
      if (!analysis.summary) {
        analysis.summary = `This product received a ${analysis.rating} star rating.`;
      }
      
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', text);
      
      analysis = {
        rating: 3,
        goodContents: [
          'Contains some nutritious ingredients',
          'Provides essential nutrients'
        ],
        badContents: [
          'May contain processed ingredients',
          'Check sodium and sugar levels'
        ],
        summary: 'Moderately healthy product with room for improvement'
      };
    }

    console.log(` Health rating: ${analysis.rating} stars`);

    res.json({
      success: true,
      analysis: analysis,
      productName: product,
      analyzedIngredients: ingredients
    });

  } catch (error) {
    console.error(' Rating analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze ingredients', 
      details: error.message 
    });
  }
});

//Analyze multiple products at once
router.post('/batch', async (req, res) => {
  try {
    const { products } = req.body;

    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ 
        error: 'Products array is required' 
      });
    }

    console.log(` Batch analyzing ${products.length} product(s)...`);

    const results = [];

    for (const product of products) {
      try {
        const { ingredients, productName, id } = product;
        
        if (!ingredients || ingredients.length === 0) {
          results.push({
            id: id,
            productName: productName,
            success: false,
            error: 'No ingredients provided'
          });
          continue;
        }

        const ingredientList = ingredients.join(', ');
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        
        const prompt = `Rate this food product's health (1-5 stars). Product: ${productName || 'Unknown'}. Ingredients: ${ingredientList}
        
Return JSON: {"rating": number, "goodContents": array, "badContents": array, "summary": string}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        const analysis = JSON.parse(text);
        analysis.rating = Math.max(1, Math.min(5, Math.round(analysis.rating || 3)));
        
        results.push({
          id: id,
          productName: productName,
          success: true,
          analysis: analysis
        });
        
      } catch (productError) {
        results.push({
          id: product.id,
          productName: product.productName,
          success: false,
          error: productError.message
        });
      }
    }

    console.log(` Batch analysis complete: ${results.filter(r => r.success).length}/${products.length} succeeded`);

    res.json({
      success: true,
      results: results,
      summary: {
        total: products.length,
        succeeded: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    });

  } catch (error) {
    console.error(' Batch rating error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze products', 
      details: error.message 
    });
  }
});

module.exports = router;