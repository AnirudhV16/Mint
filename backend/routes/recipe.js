const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Generate recipe suggestions
router.post('/generate', async (req, res) => {
  try {
    const { ingredients, customIngredients } = req.body;

    if (!ingredients || ingredients.length === 0) {
      return res.status(400).json({ 
        error: 'No ingredients provided',
        message: 'Please select at least one ingredient'
      });
    }

    const allIngredients = [...ingredients];
    if (customIngredients && customIngredients.length > 0) {
      allIngredients.push(...customIngredients);
    }

    const ingredientList = allIngredients.join(', ');
    console.log(' Generating recipes for:', ingredientList);

    // FASTEST: gemini-2.0-flash-exp (best speed/quality balance)
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const prompt = `You are a creative chef. Generate 3 different recipe ideas using these ingredients: ${ingredientList}

For each recipe provide:
1. A creative and appealing recipe name
2. Estimated cooking time in minutes
3. Difficulty level (easy, medium, or hard)
4. Brief description (one sentence)

Make the recipes practical and delicious. Use common cooking methods.

Return ONLY a valid JSON array with this exact structure:
[
  {
    "name": "Recipe Name",
    "time": "25 min",
    "difficulty": "easy",
    "description": "Brief description"
  }
]`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    let recipes;
    try {
      recipes = JSON.parse(text);
      
      if (!Array.isArray(recipes)) {
        recipes = [recipes];
      }
      
      recipes = recipes.map((recipe, index) => ({
        id: `recipe_${Date.now()}_${index}`,
        name: recipe.name || `Recipe ${index + 1}`,
        time: recipe.time || '30 min',
        difficulty: recipe.difficulty || 'medium',
        description: recipe.description || 'A delicious dish'
      }));
      
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', text);
      recipes = [
        {
          id: `recipe_${Date.now()}_1`,
          name: "Quick Stir Fry",
          time: "15 min",
          difficulty: "easy",
          description: "A fast and healthy meal"
        },
        {
          id: `recipe_${Date.now()}_2`,
          name: "Comfort Bowl",
          time: "25 min",
          difficulty: "medium",
          description: "A hearty and satisfying dish"
        },
        {
          id: `recipe_${Date.now()}_3`,
          name: "Gourmet Salad",
          time: "10 min",
          difficulty: "easy",
          description: "Fresh and nutritious"
        }
      ];
    }

    console.log(` Generated ${recipes.length} recipe(s)`);

    res.json({
      success: true,
      recipes: recipes,
      ingredientsUsed: allIngredients
    });

  } catch (error) {
    console.error(' Recipe generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate recipes', 
      details: error.message 
    });
  }
});

// Get detailed recipe instructions
router.post('/details', async (req, res) => {
  try {
    const { recipeName, ingredients } = req.body;

    if (!recipeName) {
      return res.status(400).json({ 
        error: 'Recipe name is required' 
      });
    }

    const ingredientList = ingredients ? ingredients.join(', ') : 'available ingredients';
    console.log(' Getting recipe details for:', recipeName);

    // FASTEST: gemini-2.0-flash-exp (2-3x faster than gemini-2.5-pro)
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    
    const prompt = `Create a detailed recipe for "${recipeName}" using these ingredients: ${ingredientList}

Provide:
1. Complete ingredients list with measurements (be specific)
2. Step-by-step cooking instructions (numbered, clear, and detailed)
3. Make it realistic and cookable

Return ONLY valid JSON with this exact structure:
{
  "ingredients": [
    "2 cups ingredient1",
    "1 tablespoon ingredient2",
    "250g ingredient3"
  ],
  "steps": [
    "Step 1 detailed instruction",
    "Step 2 detailed instruction"
  ],
  "servings": "2-4 people",
  "prepTime": "10 min",
  "cookTime": "20 min"
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    let recipeDetails;
    try {
      recipeDetails = JSON.parse(text);
      
      if (!recipeDetails.ingredients) {
        recipeDetails.ingredients = ['Main ingredients as needed'];
      }
      if (!recipeDetails.steps) {
        recipeDetails.steps = ['Prepare and cook ingredients'];
      }
      
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', text);
      recipeDetails = {
        ingredients: [
          '2 cups main ingredient',
          '1 tablespoon seasoning',
          'Salt and pepper to taste'
        ],
        steps: [
          'Prepare all ingredients',
          'Heat pan on medium heat',
          'Cook ingredients for 10-15 minutes',
          'Season to taste',
          'Serve hot and enjoy'
        ],
        servings: '2-4 people',
        prepTime: '10 min',
        cookTime: '20 min'
      };
    }

    console.log(' Recipe details generated');

    res.json({
      success: true,
      recipe: {
        name: recipeName,
        ...recipeDetails
      }
    });

  } catch (error) {
    console.error(' Recipe details error:', error);
    res.status(500).json({ 
      error: 'Failed to get recipe details', 
      details: error.message 
    });
  }
});

module.exports = router;