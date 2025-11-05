import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';

const getStarColor = (rating) => {
  const colors = ['#DC2626', '#EA580C', '#CA8A04', '#84CC16', '#22C55E'];
  return colors[rating - 1] || '#6B7280';
};

const getRatingLabel = (rating) => {
  const labels = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
  return labels[rating - 1] || 'Not Rated';
};

export default function RatingScreen({ theme, darkMode }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    console.log(' Loading rated products for user:', user.uid);

    const q = query(
      collection(db, 'products'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const allProducts = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        const ratedProducts = allProducts.filter(product => 
          product.ingredients && 
          product.ingredients.length > 0 &&
          product.rating
        );
        
        // Sort by rating
        ratedProducts.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        
        console.log(` Found ${ratedProducts.length} rated products out of ${allProducts.length} total`);
        setProducts(ratedProducts);
        setLoading(false);
      },
      (error) => {
        console.error('Error loading products:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const renderStars = (rating) => {
    return (
      <View style={styles.starsContainer}>
        {[...Array(5)].map((_, i) => (
          <Text
            key={i}
            style={[
              styles.star,
              { color: i < rating ? getStarColor(rating) : '#D1D5DB' }
            ]}
          >
            {i < rating ? '★' : '☆'}
          </Text>
        ))}
      </View>
    );
  };

  const renderProductCard = (product) => {
    const rating = product.rating || 3;
    const goodContents = product.goodContents || [];
    const badContents = product.badContents || [];

    return (
      <View
        key={product.id}
        style={[styles.card, { backgroundColor: theme.card }]}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.productName, { color: theme.text }]} numberOfLines={2}>
              {product.name}
            </Text>
            <Text style={[styles.ingredientCount, { color: theme.textMuted }]}>
              {product.ingredients.length} ingredients analyzed
            </Text>
          </View>
          <View style={styles.ratingBadge}>
            {renderStars(rating)}
            <Text style={[styles.ratingLabel, { color: getStarColor(rating) }]}>
              {getRatingLabel(rating)}
            </Text>
          </View>
        </View>

      
        {product.healthSummary && (
          <View style={[styles.summaryBox, { 
            backgroundColor: darkMode ? '#1F2937' : '#F9FAFB',
            borderColor: theme.border
          }]}>
            <Text style={[styles.summaryText, { color: theme.text }]}>
              {product.healthSummary}
            </Text>
          </View>
        )}

        {/* Good & Bad Contents */}
        <View style={styles.contentsContainer}>
          {goodContents.length > 0 && (
            <View style={styles.contentSection}>
              <Text style={[styles.contentTitle, { color: '#22C55E' }]}>
                ✓ Good
              </Text>
              {goodContents.slice(0, 3).map((content, index) => (
                <Text key={index} style={[styles.contentItem, { color: theme.textMuted }]}>
                  • {content}
                </Text>
              ))}
              {goodContents.length > 3 && (
                <Text style={[styles.moreText, { color: theme.textMuted }]}>
                  +{goodContents.length - 3} more
                </Text>
              )}
            </View>
          )}

          {badContents.length > 0 && (
            <View style={styles.contentSection}>
              <Text style={[styles.contentTitle, { color: '#DC2626' }]}>
                ✗ Concerns
              </Text>
              {badContents.slice(0, 3).map((content, index) => (
                <Text key={index} style={[styles.contentItem, { color: theme.textMuted }]}>
                  • {content}
                </Text>
              ))}
              {badContents.length > 3 && (
                <Text style={[styles.moreText, { color: theme.textMuted }]}>
                  +{badContents.length - 3} more
                </Text>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Health Ratings</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            AI-powered nutritional analysis
          </Text>
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={[styles.loadingText, { color: theme.textMuted }]}>
              Loading ratings...
            </Text>
          </View>
        ) : products.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>⭐</Text>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              No rated products yet
            </Text>
            <Text style={[styles.emptyDesc, { color: theme.textMuted }]}>
              Add products with clear ingredient labels to see AI-powered health ratings
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {products.map(product => renderProductCard(product))}
          </View>
        )}
      </ScrollView>
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
  grid: {
    gap: 16,
  },
  card: {
    width: '100%',
    maxWidth: 600,
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  productName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  ingredientCount: {
    fontSize: 13,
  },
  ratingBadge: {
    alignItems: 'flex-end',
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  star: {
    fontSize: 18,
    marginLeft: 1,
  },
  ratingLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  summaryBox: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 20,
  },
  contentsContainer: {
    gap: 16,
  },
  contentSection: {
    gap: 6,
  },
  contentTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  contentItem: {
    fontSize: 13,
    lineHeight: 18,
    paddingLeft: 8,
  },
  moreText: {
    fontSize: 12,
    fontStyle: 'italic',
    paddingLeft: 8,
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 15,
    marginTop: 12,
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
  },
});