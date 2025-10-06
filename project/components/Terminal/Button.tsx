/**
 * Terminal Button Components
 * Brutalist terminal-inspired button components with sharp edges and thick borders
 */

import React from 'react';
import { 
  TouchableOpacity, 
  View, 
  StyleSheet, 
  ViewStyle, 
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { terminalTheme } from '../../theme';
import { TerminalText, BlinkingCursor } from './Typography';

interface BaseButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'primary' | 'accent' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle | ViewStyle[];
  fullWidth?: boolean;
}

const BaseButton: React.FC<BaseButtonProps> = ({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  fullWidth = false,
}) => {
  const [pressed, setPressed] = React.useState(false);

  const buttonTheme = terminalTheme.colors.button[variant];
  const sizeConfig = {
    sm: { 
      paddingVertical: terminalTheme.spacing.xs,
      paddingHorizontal: terminalTheme.spacing.sm,
      fontSize: 'sm' as const,
    },
    md: {
      paddingVertical: terminalTheme.spacing.sm,
      paddingHorizontal: terminalTheme.spacing.md,
      fontSize: 'base' as const,
    },
    lg: {
      paddingVertical: terminalTheme.spacing.md,
      paddingHorizontal: terminalTheme.spacing.lg,
      fontSize: 'lg' as const,
    },
  };

  const config = sizeConfig[size];
  const isDisabled = disabled || loading;

  const buttonStyle: ViewStyle = {
    backgroundColor: pressed ? buttonTheme.hover : buttonTheme.background,
    borderColor: buttonTheme.border,
    borderWidth: terminalTheme.borderWidth.thick,
    paddingVertical: config.paddingVertical,
    paddingHorizontal: config.paddingHorizontal,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: isDisabled ? 0.5 : 1,
    ...(fullWidth && { width: '100%' }),
  };

  const textColor = pressed ? buttonTheme.hoverText : buttonTheme.text;

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[buttonStyle, style]}
      disabled={isDisabled}
    >
      {loading ? (
        <View style={styles.loadingContainer}>
          <TerminalText size={config.fontSize} color="secondary">
            LOADING...
          </TerminalText>
          <BlinkingCursor />
        </View>
      ) : (
        <TerminalText 
          size={config.fontSize}
          style={{ color: textColor }}
          weight="medium"
        >
          {children}
        </TerminalText>
      )}
    </Pressable>
  );
};

// Semantic button variants
export const TerminalButton = BaseButton;

export const PrimaryButton: React.FC<Omit<BaseButtonProps, 'variant'>> = (props) => (
  <BaseButton {...props} variant="primary" />
);

export const AccentButton: React.FC<Omit<BaseButtonProps, 'variant'>> = (props) => (
  <BaseButton {...props} variant="accent" />
);

export const WarningButton: React.FC<Omit<BaseButtonProps, 'variant'>> = (props) => (
  <BaseButton {...props} variant="warning" />
);

export const DangerButton: React.FC<Omit<BaseButtonProps, 'variant'>> = (props) => (
  <BaseButton {...props} variant="danger" />
);

// Specialized buttons
interface CommandButtonProps extends Omit<BaseButtonProps, 'children'> {
  command: string;
  description?: string;
}

export const CommandButton: React.FC<CommandButtonProps> = ({
  command,
  description,
  ...props
}) => {
  return (
    <BaseButton {...props}>
      <View style={styles.commandContainer}>
        <TerminalText color="prompt">$ </TerminalText>
        <TerminalText>{command}</TerminalText>
      </View>
      {description && (
        <TerminalText size="sm" color="secondary" style={styles.commandDescription}>
          {description}
        </TerminalText>
      )}
    </BaseButton>
  );
};

interface IconButtonProps extends Omit<BaseButtonProps, 'children'> {
  icon: React.ReactNode;
  label?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  label,
  size = 'md',
  ...props
}) => {
  return (
    <BaseButton {...props} size={size}>
      <View style={styles.iconContainer}>
        {icon}
        {label && (
          <TerminalText 
            size={size === 'sm' ? 'xs' : 'sm'}
            style={styles.iconLabel}
          >
            {label}
          </TerminalText>
        )}
      </View>
    </BaseButton>
  );
};

// Terminal window-style button group
interface ButtonGroupProps {
  children: React.ReactNode;
  style?: ViewStyle;
  spacing?: number;
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({
  children,
  style,
  spacing = terminalTheme.spacing.sm,
}) => {
  return (
    <View style={[styles.buttonGroup, { gap: spacing }, style]}>
      {children}
    </View>
  );
};

// ASCII-style toggle button
interface ToggleButtonProps extends Omit<BaseButtonProps, 'children'> {
  value: boolean;
  onToggle: (value: boolean) => void;
  trueLabel?: string;
  falseLabel?: string;
}

export const ToggleButton: React.FC<ToggleButtonProps> = ({
  value,
  onToggle,
  trueLabel = 'ON',
  falseLabel = 'OFF',
  ...props
}) => {
  const handlePress = () => {
    onToggle(!value);
  };

  return (
    <BaseButton
      {...props}
      onPress={handlePress}
      variant={value ? 'accent' : 'primary'}
    >
      <View style={styles.toggleContainer}>
        <TerminalText>[</TerminalText>
        <TerminalText 
          style={styles.toggleValue}
          color={value ? 'accent' : 'secondary'}
        >
          {value ? trueLabel : falseLabel}
        </TerminalText>
        <TerminalText>]</TerminalText>
      </View>
    </BaseButton>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commandDescription: {
    marginTop: terminalTheme.spacing.xs,
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconLabel: {
    marginLeft: terminalTheme.spacing.xs,
  },
  buttonGroup: {
    flexDirection: 'row',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleValue: {
    minWidth: 30,
    textAlign: 'center',
  },
});
