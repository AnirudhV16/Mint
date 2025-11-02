// frontend/components/AddProductModal.js - FIXED SAVE
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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { analyzeImages, rateProduct } from '../services/api';

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

  const pickImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Please grant photo library permissions');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        setSelectedImages(result.assets);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick images');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Please grant camera permissions');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        setSelectedImages([...selectedImages, result.assets[0]]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleAnalyzeImages = async () => {
    if (selectedImages.length === 0) {
      Alert.alert('No Images', 'Please select or take photos first');
      return;
    }

    setAnalyzing(true);

    try {
      console.log('🔍 Analyzing images...');
      
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
      console.log('📊 Analysis:', analysisResponse);

      if (!analysisResponse.success || !analysisResponse.data) {
        Alert.alert('Analysis Failed', 'Could not extract product information');
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
      Alert.alert('Error', 'Failed to analyze images');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = async () => {
    console.log('💾 Attempting to save...');
    
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

    console.log('Product data to save:', productData);

    try {
      await onSave(productData);
      console.log('✅ Save completed');
      onClose();
    } catch (error) {
      console.error('❌ Save error:', error);
      // Error already shown by parent component
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {editProduct ? 'Edit Product' : 'Add Product'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Image Upload */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                📸 Product Images
              </Text>
              <Text style={[styles.sectionDesc, { color: theme.textMuted }]}>
                Take clear photos of ingredient labels
              </Text>
              
              <View style={styles.imageButtons}>
                <TouchableOpacity style={styles.imageButton} onPress={pickImages}>
                  <Text style={styles.imageButtonIcon}>📷</Text>
                  <Text style={styles.imageButtonText}>Gallery</Text>
                </TouchableOpacity>

                {Platform.OS !== 'web' && (
                  <TouchableOpacity style={styles.imageButton} onPress={takePhoto}>
                    <Text style={styles.imageButtonIcon}>📸</Text>
                    <Text style={styles.imageButtonText}>Camera</Text>
                  </TouchableOpacity>
                )}
              </View>

              {selectedImages.length > 0 && (
                <View style={styles.imageCount}>
                  <Text style={[styles.imageCountText, { color: theme.text }]}>
                    ✓ {selectedImages.length} image(s)
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[
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
                  <Text style={styles.buttonText}>🔍 Analyze</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Manual Entry */}
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
                    backgroundColor: theme.bg 
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
                      backgroundColor: theme.bg 
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
                      backgroundColor: theme.bg 
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
                  📊 Analysis
                </Text>
                
                {analyzedData.ingredients.length > 0 && (
                  <View style={styles.resultBox}>
                    <Text style={[styles.resultLabel, { color: theme.textMuted }]}>
                      Ingredients: {analyzedData.ingredients.length} found
                    </Text>
                  </View>
                )}

                {analyzedData.rating && (
                  <View style={styles.resultBox}>
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

            {/* Save Button */}
            <TouchableOpacity
              style={[
                styles.saveButton,
                (!productName || !expDate) && styles.buttonDisabled
              ]}
              onPress={handleSave}
              disabled={!productName || !expDate}
            >
              <Text style={styles.buttonText}>
                {editProduct ? '💾 Update' : '✅ Save'}
              </Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 600,
    maxHeight: '90%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#6B7280',
  },
  modalBody: {
    flex: 1,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
    marginBottom: 12,
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
  imageCount: {
    padding: 12,
    backgroundColor: '#DBEAFE',
    borderRadius: 8,
    marginBottom: 12,
  },
  imageCountText: {
    fontSize: 14,
    fontWeight: '500',
  },
  analyzeButton: {
    backgroundColor: '#3B82F6',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
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
    marginBottom: 12,
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
  saveButton: {
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    margin: 20,
  },
});