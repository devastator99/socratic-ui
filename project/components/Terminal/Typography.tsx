/**
 * Terminal Typography Components
 * Monospace text components with terminal-inspired styling
 */

import React from 'react';
import { Text, TextStyle, StyleSheet } from 'react-native';
import { terminalTheme } from '../../theme';

interface BaseTextProps {
  children: React.ReactNode;
  style?: TextStyle | TextStyle[];
  color?: keyof typeof terminalTheme.colors.text;
  size?: keyof typeof terminalTheme.typography.fontSize;
  weight?: keyof typeof terminalTheme.typography.fontWeight;
  numberOfLines?: number;
  onPress?: () => void;
}

const BaseText: React.FC<BaseTextProps> = ({
  children,
  style,
  color = 'primary',
  size = 'base',
  weight = 'normal',
  numberOfLines,
  onPress,
}) => {
  const textStyle: TextStyle = {
    fontFamily: terminalTheme.typography.fontFamily.mono,
    fontSize: terminalTheme.typography.fontSize[size],
    fontWeight: terminalTheme.typography.fontWeight[weight] as TextStyle['fontWeight'],
    color: terminalTheme.colors.text[color],
    lineHeight: terminalTheme.typography.lineHeight.normal * terminalTheme.typography.fontSize[size],
  };

  return (
    <Text
      style={[textStyle, style]}
      numberOfLines={numberOfLines}
      onPress={onPress}
    >
      {children}
    </Text>
  );
};

// Semantic typography components
export const TerminalText: React.FC<BaseTextProps> = (props) => (
  <BaseText {...props} />
);

export const PromptText: React.FC<Omit<BaseTextProps, 'color'>> = (props) => (
  <BaseText {...props} color="prompt" />
);

export const AccentText: React.FC<Omit<BaseTextProps, 'color'>> = (props) => (
  <BaseText {...props} color="accent" />
);

export const WarningText: React.FC<Omit<BaseTextProps, 'color'>> = (props) => (
  <BaseText {...props} color="warning" />
);

export const ErrorText: React.FC<Omit<BaseTextProps, 'color'>> = (props) => (
  <BaseText {...props} color="error" />
);

export const SecondaryText: React.FC<Omit<BaseTextProps, 'color'>> = (props) => (
  <BaseText {...props} color="secondary" />
);

// Specialized components
interface HeaderProps extends Omit<BaseTextProps, 'size' | 'weight'> {
  level?: 1 | 2 | 3;
}

export const TerminalHeader: React.FC<HeaderProps> = ({ level = 1, children, style, ...props }) => {
  const sizeMap = {
    1: '3xl' as const,
    2: '2xl' as const,
    3: 'xl' as const,
  };

  return (
    <BaseText
      {...props}
      size={sizeMap[level]}
      weight="bold"
      style={[styles.header, style]}
    >
      {children}
    </BaseText>
  );
};

interface PromptLineProps extends Omit<BaseTextProps, 'children'> {
  prompt?: string;
  children: React.ReactNode;
}

export const PromptLine: React.FC<PromptLineProps> = ({
  prompt = terminalTheme.ascii.prompt,
  children,
  style,
  ...props
}) => {
  return (
    <BaseText {...props} style={[styles.promptLine, style]}>
      <PromptText>{prompt}</PromptText>
      {children}
    </BaseText>
  );
};

interface TypewriterTextProps extends BaseTextProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
}

export const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  speed = terminalTheme.effects.typewriter.speed,
  onComplete,
  ...props
}) => {
  const [displayText, setDisplayText] = React.useState('');

  React.useEffect(() => {
    if (text.length === 0) return;

    let currentIndex = 0;
    const intervalTime = 1000 / speed; // Convert to milliseconds

    const interval = setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayText(text.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(interval);
        onComplete?.();
      }
    }, intervalTime);

    return () => clearInterval(interval);
  }, [text, speed, onComplete]);

  return (
    <BaseText {...props}>
      {displayText}
    </BaseText>
  );
};

interface BlinkingCursorProps extends Omit<BaseTextProps, 'children'> {
  active?: boolean;
}

export const BlinkingCursor: React.FC<BlinkingCursorProps> = ({
  active = true,
  style,
  ...props
}) => {
  const [visible, setVisible] = React.useState(true);

  React.useEffect(() => {
    if (!active) return;

    const interval = setInterval(() => {
      setVisible(prev => !prev);
    }, terminalTheme.effects.cursor.blinkDuration);

    return () => clearInterval(interval);
  }, [active]);

  return (
    <BaseText
      {...props}
      style={[
        styles.cursor,
        { opacity: visible && active ? 1 : 0 },
        style,
      ]}
    >
      {terminalTheme.ascii.cursor}
    </BaseText>
  );
};

const styles = StyleSheet.create({
  header: {
    marginVertical: terminalTheme.spacing.sm,
  },
  promptLine: {
    flexDirection: 'row',
  },
  cursor: {
    width: terminalTheme.typography.fontSize.base,
  },
});
