import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import { Loader2, Brain, Zap, Download } from 'lucide-react-native';

interface LoadingSpinnerProps {
  variant?: 'default' | 'dots' | 'pulse' | 'brain' | 'custom';
  size?: 'small' | 'medium' | 'large';
  color?: string;
  text?: string;
  subText?: string;
  overlay?: boolean;
  progress?: number; // 0-100 for progress indicators
  customIcon?: React.ReactNode;
}

export function LoadingSpinner({
  variant = 'default',
  size = 'medium',
  color = '#6366F1',
  text,
  subText,
  overlay = false,
  progress,
  customIcon
}: LoadingSpinnerProps) {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const dotsAnim = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0)
  ]).current;

  useEffect(() => {
    if (variant === 'default' || variant === 'brain' || variant === 'custom') {
      // Spinning animation
      const spinAnimation = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      );
      spinAnimation.start();
      return () => spinAnimation.stop();
    }

    if (variant === 'pulse') {
      // Pulse animation
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();
      return () => pulseAnimation.stop();
    }

    if (variant === 'dots') {
      // Dots animation
      const createDotAnimation = (animValue: Animated.Value, delay: number) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(animValue, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(animValue, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
          ])
        );

      const animations = dotsAnim.map((anim, index) =>
        createDotAnimation(anim, index * 200)
      );
      
      animations.forEach(anim => anim.start());
      return () => animations.forEach(anim => anim.stop());
    }
  }, [variant]);

  // Fade in animation for overlay
  useEffect(() => {
    if (overlay) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [overlay]);

  const getSizeProps = () => {
    switch (size) {
      case 'small':
        return { width: 20, height: 20, fontSize: 12 };
      case 'large':
        return { width: 48, height: 48, fontSize: 18 };
      default:
        return { width: 32, height: 32, fontSize: 16 };
    }
  };

  const sizeProps = getSizeProps();

  const renderSpinner = () => {
    if (variant === 'default') {
      return (
        <ActivityIndicator 
          size={size === 'small' ? 'small' : 'large'} 
          color={color} 
        />
      );
    }

    if (variant === 'brain') {
      const spin = spinAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
      });

      return (
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <Brain size={sizeProps.width} color={color} />
        </Animated.View>
      );
    }

    if (variant === 'custom' && customIcon) {
      const spin = spinAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
      });

      return (
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          {customIcon}
        </Animated.View>
      );
    }

    if (variant === 'pulse') {
      return (
        <Animated.View 
          style={[
            styles.pulseContainer,
            {
              width: sizeProps.width,
              height: sizeProps.height,
              backgroundColor: color,
              transform: [{ scale: pulseAnim }],
            }
          ]} 
        />
      );
    }

    if (variant === 'dots') {
      return (
        <View style={styles.dotsContainer}>
          {dotsAnim.map((anim, index) => (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor: color,
                  opacity: anim,
                  width: sizeProps.width * 0.3,
                  height: sizeProps.width * 0.3,
                }
              ]}
            />
          ))}
        </View>
      );
    }

    // Fallback
    return (
      <Animated.View style={{ transform: [{ rotate: '0deg' }] }}>
        <Loader2 size={sizeProps.width} color={color} />
      </Animated.View>
    );
  };

  const renderProgress = () => {
    if (progress === undefined) return null;

    return (
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${Math.max(0, Math.min(100, progress))}%`, backgroundColor: color }]} />
        <Text style={[styles.progressText, { fontSize: sizeProps.fontSize - 2 }]}>
          {Math.round(progress)}%
        </Text>
      </View>
    );
  };

  const content = (
    <View style={styles.container}>
      <View style={styles.spinnerContainer}>
        {renderSpinner()}
      </View>
      
      {text && (
        <Text style={[styles.text, { fontSize: sizeProps.fontSize, color }]}>
          {text}
        </Text>
      )}
      
      {subText && (
        <Text style={[styles.subText, { fontSize: sizeProps.fontSize - 2 }]}>
          {subText}
        </Text>
      )}

      {renderProgress()}
    </View>
  );

  if (overlay) {
    return (
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <View style={styles.overlayContent}>
          {content}
        </View>
      </Animated.View>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  spinnerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  text: {
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 4,
  },

  subText: {
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },

  // Pulse variant
  pulseContainer: {
    borderRadius: 50,
  },

  // Dots variant
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },

  dot: {
    borderRadius: 50,
  },

  // Progress
  progressContainer: {
    width: 200,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
    position: 'relative',
    marginTop: 8,
  },

  progressBar: {
    height: '100%',
    borderRadius: 2,
  },

  progressText: {
    position: 'absolute',
    top: -20,
    right: 0,
    color: '#6B7280',
    fontSize: 12,
  },

  // Overlay
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },

  overlayContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    minWidth: 200,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
});
