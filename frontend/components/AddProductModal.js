// frontend/components/AddProductModal.js - WITH PERMISSION HANDLING
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
    }
  }, [visible, editProduct]);

  const pickFromGallery = async () => {
    try {
      // Check and request permission
      const hasPermission = await permissionService.ensurePermission('photos', true);
      
      if (!hasPermission) {
        console.log('⚠️ Photo library permission not granted');
        return;
      }

      const remainingSlots = 4 - selectedImages.length;
      if (remainingSlots <= 0) {
        Alert.alert('Limit Reached', 'You can only select up to 4 images');
        return;
      }

      console.log('📸 Opening photo library...');

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: remainingSlots,
        quality: 0.7,
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.slice(0, remainingSlots);
        setSelectedImages([...selectedImages, ...newImages]);
        console.log(`✅ Added ${newImages.length} image(s) from gallery`);
      }
    } catch (error) {
      console.error('Gallery error:', error);
      Alert.alert('Error', 'Failed to pick images from gallery');
    }
  };

  const takePhoto = async () => {
    try {
      if (selectedImages.length >= 4) {
        Alert.alert('Limit Reached', 'You can only select up to 4 images');
        return;
      }

      // Check and request permission with explanation
      const hasPermission = await permissionService.ensurePermission('camera', true);
      
      if (!hasPermission) {
        console.log('⚠️ Camera permission not granted');
        return;
      }

      console.log('📷 Opening camera...');

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
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const removeImage = (index) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    setSelectedImages(newImages);
    console.log(`Removed image ${index + 1}`);
  };

  const handleAnalyzeImages = async () => {
    if (selectedImages.length === 0) {
      Alert.alert('No Images', 'Please select or take photos first');
      return;
    }

    setAnalyzing(true);

    try {
      console.log('🔍 Analyzing', selectedImages.length, 'image(s)...');
      
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
      console.log('📊 Analysis response:', analysisResponse.success);

      if (!analysisResponse.success || !analysisResponse.data) {
        Alert.alert('Analysis Failed', analysisResponse.message || 'Could not extract information');
        setAnalyzing(false);
        return;
      }

      const data = analysisResponse.data;
      
      if (data.productName) setProductName(data.productName);
      if (data.mfgDate) setMfgDate(data.mfgDate);
      if (data.expDate) setExpDate(data.expDate);

      if (data.ingredients && data.ingredients.length > 0) {
        console.log('⭐ Getting health rating...');
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
          }
        } catch (ratingError) {
          console.error('Rating error:', ratingError);
          setAnalyzedData({
            ingredients: data.ingredients,
            rating: 3,
            goodContents: [],
            badContents: [],
            healthSummary: ''
          });
          Alert.alert('Partial Success', 'Product info extracted, but health rating unavailable');
        }
      } else {
        Alert.alert('Info Extracted', 'Basic info found, but no ingredients detected');
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
      Alert.alert('Error', error.message || 'Failed to analyze images');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!productName.trim()) {
      Alert.alert('Missing Info', 'Please enter product name');
      return;
    }
    if (!expDate.trim()) {
      Alert.alert('Missing Info', 'Please enter expiry date');
      return;
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(expDate)) {
      Alert.alert('Invalid Date', 'Expiry date must be YYYY-MM-DD\nExample: 2024-12-31');
      return;
    }
    if (mfgDate && !dateRegex.test(mfgDate)) {
      Alert.alert('Invalid Date', 'Manufacturing date must be YYYY-MM-DD');
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
          {/* Image Upload Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              📸 Product Images (Max 4)
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
                <Text style={styles.imageButtonText}>Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.imageButton, selectedImages.length >= 4 && styles.buttonDisabled]} 
                onPress={pickFromGallery}
                disabled={selectedImages.length >= 4}
              >
                <Text style={styles.imageButtonIcon}>📷</Text>
                <Text style={styles.imageButtonText}>Gallery</Text>
              </TouchableOpacity>
            </View>

            {/* Image Preview */}
            {selectedImages.length > 0 && (
              <View style={styles.imagePreviewContainer}>
                <Text style={[styles.imageCountText, { color: theme.text }]}>
                  {selectedImages.length}/4 images selected
                </Text>
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
                onChangeText={setProductName}
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
                  onChangeText={setMfgDate}
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
                  onChangeText={setExpDate}
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
  imageCountText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
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