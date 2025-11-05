import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { collection, onSnapshot, query, where, addDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { generateRecipes, getRecipeDetails } from '../services/api';

export default function RecipeScreen({ theme, darkMode }) {
  const [products, setProducts] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [customIngredient, setCustomIngredient] = useState('');
  const [generatedRecipes, setGeneratedRecipes] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [recipeHistory, setRecipeHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  
  const { user } = useAuth();

  // Load products from Firestore
  useEffect(() => {
    if (!user) {
      console.log(' No user logged in');
      setLoadingProducts(false);
      return;
    }

    console.log(' Loading products for user:', user.uid);
    setLoadingProducts(true);

    const q = query(
      collection(db, 'products'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const productList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log(' Loaded', productList.length, 'products');
        setProducts(productList);
        setLoadingProducts(false);
      },
      (error) => {
        console.error(' Error loading products:', error);
        setLoadingProducts(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Load recipe history
  useEffect(() => {
    if (!user) {
      console.log(' No user logged in');
      setLoadingHistory(false);
      return;
    }

    console.log(' Loading recipe history for user:', user.uid);
    setLoadingHistory(true);

    // Simple query
    const q = query(
      collection(db, 'recipeHistory'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const history = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .sort((a, b) => {
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateB - dateA;
          })
          .slice(0, 10);
        
        console.log(' Loaded', history.length, 'recipe history items');
        setRecipeHistory(history);
        setLoadingHistory(false);
      },
      (error) => {
        console.error(' Error loading recipe history:', error);
        setLoadingHistory(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const toggleItem = (itemId) => {
    if (selectedItems.includes(itemId)) {
      setSelectedItems(selectedItems.filter(id => id !== itemId));
    } else {
      setSelectedItems([...selectedItems, itemId]);
    }
  };

  const handleGenerateRecipes = async () => {
    if (selectedItems.length === 0 && !customIngredient.trim()) {
      Alert.alert('Error', 'Please select ingredients or add custom ones');
      return;
    }

    setLoading(true);
    try {
      const ingredientNames = selectedItems.map(id => {
        const product = products.find(p => p.id === id);
        return product?.name;
      }).filter(Boolean);

      const customIngredients = customIngredient
        .split(',')
        .map(i => i.trim())
        .filter(Boolean);

      console.log(' Generating recipes with:', ingredientNames, customIngredients);

      const response = await generateRecipes(ingredientNames, customIngredients);
      
      if (response.success && response.recipes) {
        setGeneratedRecipes(response.recipes);
        console.log(' Generated', response.recipes.length, 'recipes');
      } else {
        Alert.alert('Error', 'Failed to generate recipes');
      }
    } catch (error) {
      console.error(' Recipe generation error:', error);
      Alert.alert('Error', 'Failed to generate recipes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRecipe = async (recipe) => {
    setLoading(true);
    try {
      const ingredientNames = selectedItems.map(id => {
        const product = products.find(p => p.id === id);
        return product?.name;
      }).filter(Boolean);

      console.log(' Getting details for recipe:', recipe.name);

      const response = await getRecipeDetails(recipe.name, ingredientNames);
      
      if (response.success && response.recipe) {
        setSelectedRecipe(response.recipe);
        
        // Save COMPLETE recipe to history
        if (user) {
          try {
            const historyData = {
              name: recipe.name,
              ingredients: response.recipe.ingredients || [],
              steps: response.recipe.steps || [],
              prepTime: response.recipe.prepTime || '',
              cookTime: response.recipe.cookTime || '',
              servings: response.recipe.servings || '',
              description: recipe.description || '',
              difficulty: recipe.difficulty || '',
              time: recipe.time || '',
              userId: user.uid,
              createdAt: new Date().toISOString()
            };
            
            await addDoc(collection(db, 'recipeHistory'), historyData);
            console.log(' Saved COMPLETE recipe to history');
          } catch (historyError) {
            console.error(' Failed to save recipe history:', historyError);
          }
        }
      } else {
        Alert.alert('Error', 'Failed to get recipe details');
      }
    } catch (error) {
      console.error(' Recipe details error:', error);
      Alert.alert('Error', 'Failed to get recipe details');
    } finally {
      setLoading(false);
    }
  };

  const handleViewHistoryRecipe = (historyItem) => {
    console.log(' Viewing recipe from history:', historyItem.name);
    
    // Set the selected recipe from history data
    setSelectedRecipe({
      name: historyItem.name,
      ingredients: historyItem.ingredients || [],
      steps: historyItem.steps || [],
      prepTime: historyItem.prepTime || 'N/A',
      cookTime: historyItem.cookTime || 'N/A',
      servings: historyItem.servings || 'N/A'
    });
    
    setShowHistory(false);
  };

  const renderIngredientSelection = () => (
    <View>
      <Text style={[styles.subtitle, { color: theme.text }]}>
        Select Ingredients
      </Text>
      
      {loadingProducts ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>
            Loading products...
          </Text>
        </View>
      ) : products.length === 0 ? (
        <View style={[styles.emptyBox, { backgroundColor: darkMode ? '#374151' : '#F3F4F6' }]}>
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>
            No products available
          </Text>
          <Text style={[styles.emptySubText, { color: theme.textMuted }]}>
            Add products first in the Items tab
          </Text>
        </View>
      ) : (
        products.map((product) => (
          <TouchableOpacity
            key={product.id}
            style={[
              styles.checkboxItem,
              { borderColor: theme.border },
              selectedItems.includes(product.id) && styles.checkboxItemSelected
            ]}
            onPress={() => toggleItem(product.id)}
          >
            <View style={[
              styles.checkbox,
              { borderColor: theme.border },
              selectedItems.includes(product.id) && styles.checkboxChecked
            ]}>
              {selectedItems.includes(product.id) && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </View>
            <Text style={[styles.checkboxLabel, { color: theme.text }]}>
              {product.name}
            </Text>
          </TouchableOpacity>
        ))
      )}

      <TextInput
        style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
        placeholder="Add custom ingredients (e.g., eggs, salt)"
        placeholderTextColor={theme.textMuted}
        value={customIngredient}
        onChangeText={setCustomIngredient}
      />

      <TouchableOpacity
        style={[
          styles.generateButton,
          (selectedItems.length === 0 && !customIngredient.trim()) && styles.buttonDisabled
        ]}
        onPress={handleGenerateRecipes}
        disabled={selectedItems.length === 0 && !customIngredient.trim()}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>🍳 Generate Recipes</Text>
        )}
      </TouchableOpacity>

      {generatedRecipes.length > 0 && (
        <View style={styles.recipesContainer}>
          <Text style={[styles.subtitle, { color: theme.text }]}>
            Suggested Recipes:
          </Text>
          {generatedRecipes.map((recipe) => (
            <TouchableOpacity
              key={recipe.id}
              style={[styles.recipeCard, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => handleSelectRecipe(recipe)}
            >
              <View style={styles.recipeCardContent}>
                <View>
                  <Text style={[styles.recipeName, { color: theme.text }]}>
                    {recipe.name}
                  </Text>
                  <Text style={[styles.recipeInfo, { color: theme.textMuted }]}>
                    {recipe.time} • {recipe.difficulty}
                  </Text>
                  {recipe.description && (
                    <Text style={[styles.recipeDescription, { color: theme.textMuted }]}>
                      {recipe.description}
                    </Text>
                  )}
                </View>
                <Text style={styles.arrow}>→</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  const renderRecipeDetails = () => (
    <View>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => {
          setSelectedRecipe(null);
          setGeneratedRecipes([]);
        }}
      >
        <Text style={styles.backButtonText}>← Back to recipes</Text>
      </TouchableOpacity>

      <Text style={[styles.title, { color: theme.text }]}>
        {selectedRecipe.name}
      </Text>

      {selectedRecipe.prepTime && (
        <Text style={[styles.recipeInfo, { color: theme.textMuted }]}>
          Prep: {selectedRecipe.prepTime} • Cook: {selectedRecipe.cookTime} • Servings: {selectedRecipe.servings}
        </Text>
      )}

      <Text style={[styles.subtitle, { color: theme.text }]}>
        Ingredients:
      </Text>
      {selectedRecipe.ingredients && selectedRecipe.ingredients.length > 0 ? (
        selectedRecipe.ingredients.map((ingredient, index) => (
          <Text key={index} style={[styles.listItem, { color: theme.text }]}>
            • {ingredient}
          </Text>
        ))
      ) : (
        <Text style={[styles.emptyText, { color: theme.textMuted }]}>
          No ingredients listed
        </Text>
      )}

      <Text style={[styles.subtitle, { color: theme.text }]}>
        Instructions:
      </Text>
      {selectedRecipe.steps && selectedRecipe.steps.length > 0 ? (
        selectedRecipe.steps.map((step, index) => (
          <View key={index} style={styles.stepContainer}>
            <Text style={[styles.stepNumber, { color: theme.primary }]}>
              {index + 1}.
            </Text>
            <Text style={[styles.stepText, { color: theme.text }]}>
              {step}
            </Text>
          </View>
        ))
      ) : (
        <Text style={[styles.emptyText, { color: theme.textMuted }]}>
          No instructions available
        </Text>
      )}
    </View>
  );

  const renderHistory = () => (
    <View>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setShowHistory(false)}
      >
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <Text style={[styles.title, { color: theme.text }]}>
        Recipe History
      </Text>

      {loadingHistory ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>
            Loading history...
          </Text>
        </View>
      ) : recipeHistory.length === 0 ? (
        <View style={[styles.emptyBox, { backgroundColor: darkMode ? '#374151' : '#F3F4F6' }]}>
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>
            No recipe history yet
          </Text>
          <Text style={[styles.emptySubText, { color: theme.textMuted }]}>
            Generate recipes to see your history
          </Text>
        </View>
      ) : (
        recipeHistory.map((recipe) => (
          <TouchableOpacity
            key={recipe.id}
            style={[styles.historyCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => handleViewHistoryRecipe(recipe)}
          >
            <Text style={[styles.recipeName, { color: theme.text }]}>
              {recipe.name}
            </Text>
            <Text style={[styles.historyDate, { color: theme.textMuted }]}>
              {recipe.createdAt ? new Date(recipe.createdAt).toLocaleDateString() : 'Unknown date'}
            </Text>
            {recipe.time && recipe.difficulty && (
              <Text style={[styles.historyInfo, { color: theme.textMuted }]}>
                {recipe.time} • {recipe.difficulty}
              </Text>
            )}
            {recipe.description && (
              <Text style={[styles.historyDescription, { color: theme.textMuted }]} numberOfLines={2}>
                {recipe.description}
              </Text>
            )}
            <Text style={[styles.viewDetailsText, { color: theme.primary }]}>
              Tap to view full recipe →
            </Text>
          </TouchableOpacity>
        ))
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {showHistory ? (
          renderHistory()
        ) : selectedRecipe ? (
          renderRecipeDetails()
        ) : (
          renderIngredientSelection()
        )}
      </ScrollView>

      {!showHistory && !selectedRecipe && recipeHistory.length > 0 && (
        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => setShowHistory(true)}
        >
          <Text style={styles.historyButtonText}>📜</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingTop: 80,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 16,
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 12,
  },
  emptyBox: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    textAlign: 'center',
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
  },
  checkboxItemSelected: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 16,
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    fontSize: 16,
  },
  generateButton: {
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  recipesContainer: {
    marginTop: 24,
  },
  recipeCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  recipeCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recipeName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  recipeInfo: {
    fontSize: 14,
    marginBottom: 4,
  },
  recipeDescription: {
    fontSize: 14,
    marginTop: 4,
  },
  arrow: {
    fontSize: 24,
    color: '#3B82F6',
  },
  backButton: {
    marginBottom: 16,
  },
  backButtonText: {
    color: '#3B82F6',
    fontSize: 16,
  },
  listItem: {
    fontSize: 16,
    marginBottom: 8,
    paddingLeft: 8,
  },
  stepContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
    minWidth: 24,
  },
  stepText: {
    fontSize: 16,
    flex: 1,
  },
  historyButton: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    backgroundColor: '#3B82F6',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  historyButtonText: {
    fontSize: 24,
  },
  historyCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  historyDate: {
    fontSize: 14,
    marginBottom: 4,
  },
  historyInfo: {
    fontSize: 14,
    marginBottom: 4,
  },
  historyDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
});