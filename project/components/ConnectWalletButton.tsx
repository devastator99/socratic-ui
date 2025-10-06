import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Wallet, Zap, AlertCircle } from 'lucide-react-native';
import { useWallet } from '../context/WalletContext';

interface ConnectWalletButtonProps {
  variant?: 'primary' | 'secondary' | 'minimal';
  size?: 'small' | 'medium' | 'large';
  showBalance?: boolean;
  onConnectSuccess?: () => void;
  onConnectError?: (error: string) => void;
}

export function ConnectWalletButton({ 
  variant = 'primary', 
  size = 'medium',
  showBalance = false,
  onConnectSuccess,
  onConnectError
}: ConnectWalletButtonProps) {
  const { 
    publicKey, 
    connected, 
    connecting, 
    connect, 
    disconnect, 
    connectionError,
    balance 
  } = useWallet();

  const handlePress = async () => {
    if (connected) {
      await disconnect();
    } else {
      try {
        await connect();
        onConnectSuccess?.();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Connection failed';
        onConnectError?.(errorMessage);
      }
    }
  };

  const getButtonStyle = () => {
    const baseStyle = [styles.button, styles[size]];
    
    if (connected) {
      baseStyle.push(styles.connected);
    } else if (connectionError) {
      baseStyle.push(styles.error);
    } else {
      baseStyle.push(styles[variant]);
    }
    
    return baseStyle;
  };

  const getIconColor = () => {
    if (connected) return '#10B981';
    if (connectionError) return '#EF4444';
    if (variant === 'secondary') return '#6366F1';
    if (variant === 'minimal') return '#6B7280';
    return '#FFFFFF';
  };

  const getTextColor = () => {
    if (connected) return '#10B981';
    if (connectionError) return '#EF4444';
    if (variant === 'secondary') return '#6366F1';
    if (variant === 'minimal') return '#6B7280';
    return '#FFFFFF';
  };

  const formatAddress = (address: string) => {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  const formatBalance = (balance: number) => {
    if (balance < 0.01) return '< 0.01 SOL';
    return `${balance.toFixed(2)} SOL`;
  };

  const renderIcon = () => {
    if (connecting) {
      return <ActivityIndicator size="small" color={getIconColor()} />;
    }
    
    if (connectionError) {
      return <AlertCircle size={size === 'small' ? 16 : size === 'large' ? 24 : 20} color={getIconColor()} />;
    }
    
    if (connected) {
      return <Zap size={size === 'small' ? 16 : size === 'large' ? 24 : 20} color={getIconColor()} />;
    }
    
    return <Wallet size={size === 'small' ? 16 : size === 'large' ? 24 : 20} color={getIconColor()} />;
  };

  const renderText = () => {
    if (connecting) {
      return 'Connecting...';
    }
    
    if (connectionError) {
      return 'Connection Failed';
    }
    
    if (connected && publicKey) {
      if (showBalance && balance > 0) {
        return (
          <View style={styles.connectedInfo}>
            <Text style={[styles.buttonText, { color: getTextColor() }]}>
              {formatAddress(publicKey.toString())}
            </Text>
            <Text style={[styles.balanceText, { color: getTextColor() }]}>
              {formatBalance(balance)}
            </Text>
          </View>
        );
      }
      return formatAddress(publicKey.toString());
    }
    
    return 'Connect Wallet';
  };

  return (
    <TouchableOpacity 
      style={getButtonStyle()} 
      onPress={handlePress}
      disabled={connecting}
      activeOpacity={0.8}
    >
      <View style={styles.buttonContent}>
        {renderIcon()}
        <View style={styles.textContainer}>
          {typeof renderText() === 'string' ? (
            <Text style={[styles.buttonText, { color: getTextColor() }]}>
              {renderText()}
            </Text>
          ) : (
            renderText()
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  
  // Size variants
  small: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  medium: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  large: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
  },
  
  // Style variants
  primary: {
    backgroundColor: '#6366F1',
  },
  secondary: {
    backgroundColor: 'transparent',
    borderColor: '#6366F1',
  },
  minimal: {
    backgroundColor: 'transparent',
  },
  
  // States
  connected: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  error: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  textContainer: {
    marginLeft: 8,
  },
  
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  connectedInfo: {
    alignItems: 'flex-start',
  },
  
  balanceText: {
    fontSize: 12,
    fontWeight: '400',
    opacity: 0.8,
    marginTop: 2,
  },
});
