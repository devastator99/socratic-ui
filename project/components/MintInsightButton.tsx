import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import { Sparkles, X } from 'lucide-react-native';

interface MintInsightButtonProps {
  onMint: () => void;
  onClose: () => void;
}

export function MintInsightButton({ onMint, onClose }: MintInsightButtonProps) {
  const shimmerAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Scale in animation
    Animated.spring(scaleAnimation, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();

    // Shimmer animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnimation, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnimation, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const shimmerOpacity = shimmerAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 1, 0.3],
  });

  return (
    <BlurView intensity={80} style={styles.overlay}>
      <Animated.View 
        style={[
          styles.container,
          { transform: [{ scale: scaleAnimation }] }
        ]}
      >
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <X size={16} color="#888888" strokeWidth={1.5} />
        </TouchableOpacity>
        
        <View style={styles.content}>
          <Animated.View style={[styles.iconContainer, { opacity: shimmerOpacity }]}>
            <Sparkles size={32} color="#FFFFFF" strokeWidth={1.5} />
          </Animated.View>
          
          <Text style={styles.title}>Mint as NFT</Text>
          <Text style={styles.description}>
            Turn this insight into a soulbound NFT to track your learning journey
          </Text>
          
          <TouchableOpacity style={styles.mintButton} onPress={onMint}>
            <Sparkles size={20} color="#000000" strokeWidth={2} />
            <Text style={styles.mintButtonText}>Mint Insight</Text>
          </TouchableOpacity>
          
          <Text style={styles.costText}>Cost: 0.05 SOL</Text>
        </View>
      </Animated.View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    backgroundColor: '#000000',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#333333',
    alignItems: 'center',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingTop: 16,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#222222',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#CCCCCC',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  mintButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    gap: 8,
    marginBottom: 12,
  },
  mintButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    fontWeight: '600',
  },
  costText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#888888',
  },
});