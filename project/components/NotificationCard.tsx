import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  X, 
  Bell,
  Zap,
  Gift,
  MessageSquare
} from 'lucide-react-native';

export type NotificationType = 'success' | 'warning' | 'info' | 'error' | 'achievement' | 'reward' | 'message';

interface NotificationCardProps {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp?: Date;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: (id: string) => void;
  autoHide?: boolean;
  autoHideDelay?: number;
  showIcon?: boolean;
  variant?: 'default' | 'compact' | 'banner';
}

export function NotificationCard({
  id,
  type,
  title,
  message,
  timestamp,
  actionLabel,
  onAction,
  onDismiss,
  autoHide = true,
  autoHideDelay = 5000,
  showIcon = true,
  variant = 'default'
}: NotificationCardProps) {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Slide in animation
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto hide
    if (autoHide && autoHideDelay > 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, autoHideDelay);

      return () => clearTimeout(timer);
    }
  }, [autoHide, autoHideDelay]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss?.(id);
    });
  };

  const getIcon = () => {
    const iconSize = variant === 'compact' ? 16 : 20;
    const iconColor = getIconColor();

    switch (type) {
      case 'success':
        return <CheckCircle size={iconSize} color={iconColor} />;
      case 'warning':
        return <AlertTriangle size={iconSize} color={iconColor} />;
      case 'error':
        return <AlertTriangle size={iconSize} color={iconColor} />;
      case 'achievement':
        return <Zap size={iconSize} color={iconColor} />;
      case 'reward':
        return <Gift size={iconSize} color={iconColor} />;
      case 'message':
        return <MessageSquare size={iconSize} color={iconColor} />;
      default:
        return <Info size={iconSize} color={iconColor} />;
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'success':
        return '#10B981';
      case 'warning':
        return '#F59E0B';
      case 'error':
        return '#EF4444';
      case 'achievement':
        return '#8B5CF6';
      case 'reward':
        return '#F59E0B';
      case 'message':
        return '#6366F1';
      default:
        return '#6B7280';
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return '#10B98108';
      case 'warning':
        return '#F59E0B08';
      case 'error':
        return '#EF444408';
      case 'achievement':
        return '#8B5CF608';
      case 'reward':
        return '#F59E0B08';
      case 'message':
        return '#6366F108';
      default:
        return '#6B728008';
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'success':
        return '#10B98120';
      case 'warning':
        return '#F59E0B20';
      case 'error':
        return '#EF444420';
      case 'achievement':
        return '#8B5CF620';
      case 'reward':
        return '#F59E0B20';
      case 'message':
        return '#6366F120';
      default:
        return '#6B728020';
    }
  };

  const formatTimestamp = () => {
    if (!timestamp) return '';
    
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return timestamp.toLocaleDateString();
  };

  if (variant === 'banner') {
    return (
      <Animated.View
        style={[
          styles.bannerContainer,
          {
            backgroundColor: getBackgroundColor(),
            borderLeftColor: getIconColor(),
            transform: [{ translateY: slideAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        <View style={styles.bannerContent}>
          {showIcon && (
            <View style={styles.bannerIcon}>
              {getIcon()}
            </View>
          )}
          <View style={styles.bannerText}>
            <Text style={styles.bannerTitle}>{title}</Text>
            <Text style={styles.bannerMessage}>{message}</Text>
          </View>
          <TouchableOpacity onPress={handleDismiss} style={styles.bannerDismiss}>
            <X size={18} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }

  if (variant === 'compact') {
    return (
      <Animated.View
        style={[
          styles.compactContainer,
          {
            backgroundColor: getBackgroundColor(),
            borderColor: getBorderColor(),
            transform: [{ translateY: slideAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.compactContent}
          onPress={onAction}
          activeOpacity={onAction ? 0.7 : 1}
        >
          {showIcon && (
            <View style={styles.compactIcon}>
              {getIcon()}
            </View>
          )}
          <Text style={styles.compactText} numberOfLines={1}>
            {title}
          </Text>
          <TouchableOpacity onPress={handleDismiss} style={styles.compactDismiss}>
            <X size={14} color="#6B7280" />
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // Default variant
  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <View style={styles.header}>
        {showIcon && (
          <View style={styles.iconContainer}>
            {getIcon()}
          </View>
        )}
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          {timestamp && (
            <Text style={styles.timestamp}>{formatTimestamp()}</Text>
          )}
        </View>
        <TouchableOpacity onPress={handleDismiss} style={styles.dismissButton}>
          <X size={18} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <Text style={styles.message}>{message}</Text>

      {actionLabel && onAction && (
        <TouchableOpacity style={styles.actionButton} onPress={onAction}>
          <Text style={[styles.actionText, { color: getIconColor() }]}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Default variant
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },

  iconContainer: {
    marginRight: 12,
    marginTop: 2,
  },

  headerText: {
    flex: 1,
  },

  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },

  timestamp: {
    fontSize: 12,
    color: '#6B7280',
  },

  dismissButton: {
    padding: 4,
    marginLeft: 8,
  },

  message: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 12,
  },

  actionButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },

  actionText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Compact variant
  compactContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },

  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },

  compactIcon: {
    marginRight: 8,
  },

  compactText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },

  compactDismiss: {
    padding: 4,
    marginLeft: 8,
  },

  // Banner variant
  bannerContainer: {
    borderLeftWidth: 4,
    marginVertical: 2,
  },

  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },

  bannerIcon: {
    marginRight: 12,
  },

  bannerText: {
    flex: 1,
  },

  bannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },

  bannerMessage: {
    fontSize: 13,
    color: '#4B5563',
  },

  bannerDismiss: {
    padding: 4,
    marginLeft: 8,
  },
});
