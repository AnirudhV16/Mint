// frontend/components/ItemScreen.js - FIXED PERMISSION ISSUE
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import ItemCard from './ItemCard';
import AddProductModal from './AddProductModal';

export default function ItemScreen({ theme, darkMode }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      console.log('No user logged in');
      setLoading(false);
      return;
    }

    console.log('📦 Loading products for user:', user.uid);

    // IMPORTANT: Must use where clause to match security rules
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
        
        productList.sort((a, b) => new Date(a.expDate) - new Date(b.expDate));
        
        console.log('✅ Loaded', productList.length, 'products');
        setProducts(productList);
        setLoading(false);
      },
      (error) => {
        console.error('❌ Load error:', error.code, error.message);
        Alert.alert('Error', 'Failed to load products');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleSaveProduct = async (productData) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in');
      return;
    }

    try {
      if (editingProduct) {
        console.log('💾 Updating:', editingProduct.id);
        
        await updateDoc(doc(db, 'products', editingProduct.id), {
          ...productData,
          userId: user.uid, // Ensure userId is set
          updatedAt: new Date().toISOString(),
        });
        
        console.log('✅ Updated successfully');
        Alert.alert('Success', 'Product updated!');
      } else {
        console.log('➕ Adding new product');
        
        await addDoc(collection(db, 'products'), {
          ...productData,
          userId: user.uid, // Must include userId
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        
        console.log('✅ Added successfully');
        Alert.alert('Success', 'Product added!');
      }
      
      setEditingProduct(null);
    } catch (error) {
      console.error('❌ Save error:', error.code, error.message);
      Alert.alert('Error', `Failed to save: ${error.message}`);
      throw error;
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in');
      return;
    }

    try {
      console.log('🗑️ Deleting:', productId);
      
      await deleteDoc(doc(db, 'products', productId));
      
      console.log('✅ Deleted successfully');
      // Don't show alert here - card already shows confirmation
    } catch (error) {
      console.error('❌ Delete error:', error.code, error.message);
      Alert.alert('Error', `Failed to delete: ${error.message}`);
    }
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setModalVisible(true);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setModalVisible(true);
  };

  const expiringSoon = products.filter(p => {
    const daysLeft = Math.ceil((new Date(p.expDate) - new Date()) / (1000 * 60 * 60 * 24));
    return daysLeft >= 0 && daysLeft <= 7;
  }).length;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: theme.text }]}>Food Tracker</Text>
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>
              {products.length} {products.length === 1 ? 'item' : 'items'}
              {expiringSoon > 0 && ` • ${expiringSoon} expiring soon`}
            </Text>
          </View>
          
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddProduct}
          >
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <Text style={[styles.loadingText, { color: theme.textMuted }]}>
              Loading...
            </Text>
          </View>
        ) : products.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🧺</Text>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              No products yet
            </Text>
            <Text style={[styles.emptyDesc, { color: theme.textMuted }]}>
              Track your food items to monitor expiry dates
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={handleAddProduct}
            >
              <Text style={styles.emptyButtonText}>Add Your First Product</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.grid}>
            {products.map((product) => (
              <ItemCard
                key={product.id}
                product={product}
                theme={theme}
                onEdit={() => handleEditProduct(product)}
                onDelete={() => handleDeleteProduct(product.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <AddProductModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setEditingProduct(null);
        }}
        onSave={handleSaveProduct}
        editProduct={editingProduct}
        theme={theme}
      />
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
    padding: 20,
    paddingTop: 80,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  addButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  centerContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 15,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});