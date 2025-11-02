// frontend/components/ItemCard.js - SIMPLE & PROFESSIONAL
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';

const calculateDaysUntilExpiry = (expDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expDate);
  expiry.setHours(0, 0, 0, 0);
  const diff = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  return diff;
};

const getExpiryStatus = (daysLeft) => {
  if (daysLeft < 0) return { text: 'Expired', color: '#DC2626', bg: '#FEE2E2' };
  if (daysLeft === 0) return { text: 'Expires today', color: '#EA580C', bg: '#FFEDD5' };
  if (daysLeft <= 3) return { text: `${daysLeft} days left`, color: '#EA580C', bg: '#FFEDD5' };
  if (daysLeft <= 7) return { text: `${daysLeft} days left`, color: '#CA8A04', bg: '#FEF3C7' };
  return { text: `${daysLeft} days left`, color: '#059669', bg: '#D1FAE5' };
};

export default function ItemCard({ product, theme, onEdit, onDelete }) {
  const daysLeft = calculateDaysUntilExpiry(product.expDate);
  const expiryStatus = getExpiryStatus(daysLeft);

  const handleDelete = () => {
    console.log('🗑️ Delete initiated for:', product.id);
    
    Alert.alert(
      'Delete Product',
      `Delete "${product.name}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => console.log('Delete cancelled')
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            console.log('✓ Deleting product:', product.id);
            if (onDelete) {
              onDelete();
            } else {
              console.error('❌ onDelete not provided');
            }
          }
        }
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.card }]}>
      {/* Product Info */}
      <View style={styles.content}>
        <Text style={[styles.productName, { color: theme.text }]} numberOfLines={2}>
          {product.name}
        </Text>
        
        <View style={[styles.expiryBadge, { backgroundColor: expiryStatus.bg }]}>
          <Text style={[styles.expiryText, { color: expiryStatus.color }]}>
            {expiryStatus.text}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            console.log('✏️ Edit clicked');
            if (onEdit) onEdit();
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.actionText, { color: '#3B82F6' }]}>Edit</Text>
        </TouchableOpacity>
        
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleDelete}
          activeOpacity={0.7}
        >
          <Text style={[styles.actionText, { color: '#DC2626' }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  content: {
    padding: 20,
  },
  productName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    lineHeight: 24,
  },
  expiryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  expiryText: {
    fontSize: 13,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  divider: {
    width: 1,
  },
});