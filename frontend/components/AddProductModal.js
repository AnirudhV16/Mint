// frontend/components/AddProductModal.js - PRODUCTION ERROR HANDLING
import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  Image,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { analyzeImages, rateProduct } from '../services/api';
import permissionService from '../services/permissionService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function AddProductModal({ visible, onClose, onSave, editProduct, theme }) {
  const [productName, setProductName] = useState('');
  const [mfgDate, setMfgDate] = useState('');
  const [expDate, setExpDate] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzedData, setAnalyzedData] = useState(null);
  const [errorMessage, setErrorMessage] = useState(''); // Main error display

  React.useEffect(() => {
    if (visible) {
      if (editProduct) {
        setProductName(editProduct.name || '');
        setMfgDate(editProduct.mfgDate || '');
        setExpDate(editProduct.expDate || '');
        setAnalyzedData({
          ingredients: editProduct.ingredients || [],
          rating: editProduct.rating || 3,
          goodContents: editProduct.goodContents || [],
          badContents: editProduct.badContents || [],
          healthSummary: editProduct.healthSummary || ''
        });
      } else {
        setProductName('');
        setMfgDate('');
        setExpDate('');
        setAnalyzedData(null);
      }
      setSelectedImages([]);
      setErrorMessage(''); // Clear error on open
    }
  }, [visible, editProduct]);

  const pickFromGallery = async () => {
    try {
      setErrorMessage(''); // Clear previous errors
      
      const remainingSlots = 4 - selectedImages.length;
      
      // CHECK LIMIT BEFORE OPENING PICKER
      if (remainingSlots <= 0) {
        setErrorMessage('Image limit reached. Maximum 4 images allowed.');
        return; // STOP HERE - Don't open picker
      }

      // Check permission
      const hasPermission = await permissionService.ensurePermission('photos', true);
      
      if (!hasPermission) {
        setErrorMessage('Photo library access denied. Please enable in settings.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: remainingSlots,
        quality: 0.7,
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.slice(0, remainingSlots);
        
        // Check if trying to add more than allowed
        if (result.assets.length > remainingSlots) {
          setErrorMessage(`Only ${remainingSlots} more image(s) allowed. ${newImages.length} added.`);
        }
        
        setSelectedImages([...selectedImages, ...newImages]);
        console.log(`✅ Added ${newImages.length} image(s) from gallery`);
      }
    } catch (error) {
      console.error('Gallery error:', error);
      setErrorMessage('Failed to pick images. Please try again.');
    }
  };

  const takePhoto = async () => {
    try {
      setErrorMessage(''); // Clear previous errors
      
      // CHECK LIMIT BEFORE OPENING CAMERA
      if (selectedImages.length >= 4) {
        setErrorMessage('Image limit reached. Maximum 4 images allowed.');
        return; // STOP HERE - Don't open camera
      }

      // Check permission
      const hasPermission = await permissionService.ensurePermission('camera', true);
      
      if (!hasPermission) {
        setErrorMessage('Camera access denied. Please enable in settings.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.7,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setSelectedImages([...selectedImages, result.assets[0]]);
        console.log('✅ Photo captured');
      }
    } catch (error) {
      console.error('Camera error:', error);
      setErrorMessage('Failed to take photo. Please try again.');
    }
  };

  const removeImage = (index) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    setSelectedImages(newImages);
    setErrorMessage(''); // Clear error when removing images
  };

  const handleAnalyzeImages = async () => {
    if (selectedImages.length === 0) {
      setErrorMessage('Please add at least one image to analyze');
      return;
    }

    setAnalyzing(true);
    setErrorMessage(''); // Clear previous errors

    try {
      let imageFiles;
      if (Platform.OS === 'web') {
        imageFiles = await Promise.all(
          selectedImages.map(async (asset, index) => {
            const response = await fetch(asset.uri);
            const blob = await response.blob();
            return new File([blob], `image_${index}.jpg`, { type: 'image/jpeg' });
          })
        );
      } else {
        imageFiles = selectedImages.map((asset, index) => ({
          uri: asset.uri,
          type: 'image/jpeg',
          name: `image_${index}.jpg`,
        }));
      }

      const analysisResponse = await analyzeImages(imageFiles);

      if (!analysisResponse.success || !analysisResponse.data) {
        setErrorMessage(analysisResponse.message || 'Could not extract text from images. Please take clearer photos.');
        setAnalyzing(false);
        return;
      }

      const data = analysisResponse.data;
      
      if (data.productName) setProductName(data.productName);
      if (data.mfgDate) setMfgDate(data.mfgDate);
      if (data.expDate) setExpDate(data.expDate);

      if (data.ingredients && data.ingredients.length > 0) {
        try {
          const ratingResponse = await rateProduct(data.ingredients, data.productName);
          
          if (ratingResponse.success && ratingResponse.analysis) {
            setAnalyzedData({
              ingredients: data.ingredients,
              rating: ratingResponse.analysis.rating || 3,
              goodContents: ratingResponse.analysis.goodContents || [],
              badContents: ratingResponse.analysis.badContents || [],
              healthSummary: ratingResponse.analysis.summary || ''
            });
            
            Alert.alert(
              'Success! ✅', 
              `Found ${data.ingredients.length} ingredients\nRating: ${ratingResponse.analysis.rating}/5 ⭐`
            );
          } else {
            setErrorMessage('Product info extracted, but health rating unavailable');
            setAnalyzedData({
              ingredients: data.ingredients,
              rating: 3,
              goodContents: [],
              badContents: [],
              healthSummary: ''
            });
          }
        } catch (ratingError) {
          console.error('Rating error:', ratingError);
          setErrorMessage('Product info extracted, but health rating failed');
          setAnalyzedData({
            ingredients: data.ingredients,
            rating: 3,
            goodContents: [],
            badContents: [],
            healthSummary: ''
          });
        }
      } else {
        setErrorMessage('Basic info found, but no ingredients detected. Try different images.');
        setAnalyzedData({
          ingredients: [],
          rating: 3,
          goodContents: [],
          badContents: [],
          healthSummary: ''
        });
      }

    } catch (error) {
      console.error('Analysis error:', error);
      
      // Show user-friendly error messages
      if (error.response) {
        if (error.response.status === 413) {
          setErrorMessage('Images are too large. Please use smaller images.');
        } else if (error.response.status === 500) {
          setErrorMessage('Server error. Please try again later.');
        } else {
          setErrorMessage(error.response.data?.message || 'Analysis failed. Please try again.');
        }
      } else if (error.message.includes('Network')) {
        setErrorMessage('Network error. Check your internet connection.');
      } else if (error.message.includes('timeout')) {
        setErrorMessage('Request timed out. Please try again.');
      } else {
        setErrorMessage('Failed to analyze images. Please try again.');
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = async () => {
    setErrorMessage(''); // Clear previous errors
    
    if (!productName.trim()) {
      setErrorMessage('Please enter product name');
      return;
    }
    if (!expDate.trim()) {
      setErrorMessage('Please enter expiry date');
      return;
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(expDate)) {
      setErrorMessage('Expiry date must be in YYYY-MM-DD format (e.g., 2024-12-31)');
      return;
    }
    if (mfgDate && !dateRegex.test(mfgDate)) {
      setErrorMessage('Manufacturing date must be in YYYY-MM-DD format');
      return;
    }

    const productData = {
      name: productName.trim(),
      mfgDate: mfgDate.trim() || new Date().toISOString().split('T')[0],
      expDate: expDate.trim(),
      ingredients: analyzedData?.ingredients || [],
      rating: analyzedData?.rating || 3,
      goodContents: analyzedData?.goodContents || [],
      badContents: analyzedData?.badContents || [],
      healthSummary: analyzedData?.healthSummary || '',
    };

    try {
      await onSave(productData);
      onClose();
    } catch (error) {
      console.error('Save error:', error);
      setErrorMessage('Failed to save product. Please try again.');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        {/* Fixed Header */}
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.text }]}>
            {editProduct ? 'Edit Product' : 'Add Product'}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Scrollable Content */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ERROR MESSAGE DISPLAY - Prominent */}
          {errorMessage ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>
              <TouchableOpacity 
                onPress={() => setErrorMessage('')}
                style={styles.errorClose}
              >
                <Text style={styles.errorCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Image Upload Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              📸 Product Images ({selectedImages.length}/4)
            </Text>
            <Text style={[styles.sectionDesc, { color: theme.textMuted }]}>
              Take clear photos of ingredient labels
            </Text>
            
            <View style={styles.imageButtons}>
              <TouchableOpacity 
                style={[styles.imageButton, selectedImages.length >= 4 && styles.buttonDisabled]} 
                onPress={takePhoto}
                disabled={selectedImages.length >= 4}
              >
                <Text style={styles.imageButtonIcon}>📸</Text>
                <Text style={styles.imageButtonText}>
                  {selectedImages.length >= 4 ? 'Limit Reached' : 'Camera'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.imageButton, selectedImages.length >= 4 && styles.buttonDisabled]} 
                onPress={pickFromGallery}
                disabled={selectedImages.length >= 4}
              >
                <Text style={styles.imageButtonIcon}>📷</Text>
                <Text style={styles.imageButtonText}>
                  {selectedImages.length >= 4 ? 'Limit Reached' : 'Gallery'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Image Preview */}
            {selectedImages.length > 0 && (
              <View style={styles.imagePreviewContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
                  {selectedImages.map((image, index) => (
                    <View key={index} style={styles.imagePreview}>
                      <Image source={{ uri: image.uri }} style={styles.previewImage} />
                      <TouchableOpacity 
                        style={styles.removeImageButton}
                        onPress={() => removeImage(index)}
                      >
                        <Text style={styles.removeImageText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.analyzeButton,
                (selectedImages.length === 0 || analyzing) && styles.buttonDisabled
              ]}
              onPress={handleAnalyzeImages}
              disabled={selectedImages.length === 0 || analyzing}
            >
              {analyzing ? (
                <>
                  <ActivityIndicator color="#FFF" size="small" />
                  <Text style={[styles.buttonText, { marginLeft: 8 }]}>
                    Analyzing...
                  </Text>
                </>
              ) : (
                <Text style={styles.buttonText}>🔍 Analyze Images</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Manual Entry Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              ✏️ Product Details
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Name *</Text>
              <TextInput
                style={[styles.input, { 
                  color: theme.text, 
                  borderColor: theme.border,
                  backgroundColor: theme.card 
                }]}
                value={productName}
                onChangeText={(text) => {
                  setProductName(text);
                  setErrorMessage(''); // Clear error on input
                }}
                placeholder="Product name"
                placeholderTextColor={theme.textMuted}
              />
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputGroupHalf}>
                <Text style={[styles.label, { color: theme.text }]}>Mfg Date</Text>
                <TextInput
                  style={[styles.input, { 
                    color: theme.text, 
                    borderColor: theme.border,
                    backgroundColor: theme.card 
                  }]}
                  value={mfgDate}
                  onChangeText={(text) => {
                    setMfgDate(text);
                    setErrorMessage('');
                  }}
                  placeholder="2024-01-01"
                  placeholderTextColor={theme.textMuted}
                />
              </View>

              <View style={styles.inputGroupHalf}>
                <Text style={[styles.label, { color: theme.text }]}>Exp Date *</Text>
                <TextInput
                  style={[styles.input, { 
                    color: theme.text, 
                    borderColor: theme.border,
                    backgroundColor: theme.card 
                  }]}
                  value={expDate}
                  onChangeText={(text) => {
                    setExpDate(text);
                    setErrorMessage('');
                  }}
                  placeholder="2024-12-31"
                  placeholderTextColor={theme.textMuted}
                />
              </View>
            </View>
          </View>

          {/* Analysis Results */}
          {analyzedData && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                📊 Analysis Results
              </Text>
              
              {analyzedData.ingredients.length > 0 && (
                <View style={[styles.resultBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Text style={[styles.resultLabel, { color: theme.textMuted }]}>
                    Ingredients: {analyzedData.ingredients.length} found
                  </Text>
                </View>
              )}

              {analyzedData.rating && (
                <View style={[styles.resultBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Text style={[styles.resultLabel, { color: theme.textMuted }]}>
                    Health Rating:
                  </Text>
                  <View style={styles.ratingDisplay}>
                    {[...Array(5)].map((_, i) => (
                      <Text key={i} style={styles.ratingStar}>
                        {i < analyzedData.rating ? '⭐' : '☆'}
                      </Text>
                    ))}
                    <Text style={[styles.ratingText, { color: theme.text }]}>
                      {analyzedData.rating}/5
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}

          <View style={{ height: 20 }} />
        </ScrollView>

        {/* Fixed Bottom Button */}
        <View style={[styles.footer, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.saveButton,
              (!productName || !expDate) && styles.buttonDisabled
            ]}
            onPress={handleSave}
            disabled={!productName || !expDate}
          >
            <Text style={styles.buttonText}>
              {editProduct ? '💾 Update Product' : '✅ Save Product'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 28,
    color: '#6B7280',
    fontWeight: '300',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  // ERROR CONTAINER - Prominent display
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#DC2626',
  },
  errorIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '600',
  },
  errorClose: {
    padding: 4,
  },
  errorCloseText: {
    fontSize: 18,
    color: '#DC2626',
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 13,
    marginBottom: 16,
  },
  imageButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  imageButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  imageButtonIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  imageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  imagePreviewContainer: {
    marginBottom: 16,
  },
  imageScroll: {
    flexDirection: 'row',
  },
  imagePreview: {
    position: 'relative',
    marginRight: 8,
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  removeImageButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  actionButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  analyzeButton: {
    backgroundColor: '#3B82F6',
  },
  saveButton: {
    backgroundColor: '#10B981',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputGroupHalf: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
  },
  resultBox: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
  },
  resultLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  ratingDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingStar: {
    fontSize: 18,
  },
  ratingText: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: 1,
  },
});