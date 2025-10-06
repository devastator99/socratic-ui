/**
 * Terminal Effects Components
 * Interactive terminal-inspired effects like ASCII loaders, scanlines, and glitch effects
 */

import React from 'react';
import { 
  View, 
  StyleSheet, 
  ViewStyle, 
  Animated,
  Easing,
} from 'react-native';
import { terminalTheme } from '../../theme';
import { TerminalText } from './Typography';

// ASCII Loading Spinner
interface ASCIILoaderProps {
  style?: ViewStyle;
  size?: keyof typeof terminalTheme.typography.fontSize;
  color?: keyof typeof terminalTheme.colors.text;
}

export const ASCIILoader: React.FC<ASCIILoaderProps> = ({
  style,
  size = 'base',
  color = 'accent',
}) => {
  const [frameIndex, setFrameIndex] = React.useState(0);
  const frames = terminalTheme.ascii.loading;

  React.useEffect(() => {
    const interval = setInterval(() => {
      setFrameIndex(prev => (prev + 1) % frames.length);
    }, 200);

    return () => clearInterval(interval);
  }, [frames.length]);

  return (
    <TerminalText 
      size={size} 
      color={color} 
      style={[styles.loader, style]}
    >
      {frames[frameIndex]}
    </TerminalText>
  );
};

// Matrix-style character rain
interface MatrixRainProps {
  style?: ViewStyle;
  density?: number;
  speed?: number;
}

export const MatrixRain: React.FC<MatrixRainProps> = ({
  style,
  density = 20,
  speed = 100,
}) => {
  const [drops, setDrops] = React.useState<Array<{
    id: number;
    char: string;
    x: number;
    y: number;
    opacity: number;
  }>>([]);

  const characters = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';

  React.useEffect(() => {
    const interval = setInterval(() => {
      setDrops(prev => {
        const newDrops = prev
          .map(drop => ({
            ...drop,
            y: drop.y + 1,
            opacity: Math.max(0, drop.opacity - 0.02),
          }))
          .filter(drop => drop.opacity > 0);

        // Add new drops randomly
        if (Math.random() < 0.3) {
          for (let i = 0; i < density; i++) {
            if (Math.random() < 0.1) {
              newDrops.push({
                id: Math.random(),
                char: characters[Math.floor(Math.random() * characters.length)],
                x: Math.random() * 100,
                y: 0,
                opacity: 1,
              });
            }
          }
        }

        return newDrops;
      });
    }, speed);

    return () => clearInterval(interval);
  }, [density, speed, characters]);

  return (
    <View style={[styles.matrixContainer, style]} pointerEvents="none">
      {drops.map(drop => (
        <TerminalText
          key={drop.id}
          size="xs"
          color="accent"
          style={[
            styles.matrixDrop,
            {
              left: `${drop.x}%`,
              top: drop.y,
              opacity: drop.opacity,
            },
          ]}
        >
          {drop.char}
        </TerminalText>
      ))}
    </View>
  );
};

// Terminal scanlines effect
interface ScanlinesProps {
  style?: ViewStyle;
  intensity?: number;
  speed?: number;
}

export const Scanlines: React.FC<ScanlinesProps> = ({
  style,
  intensity = 0.1,
  speed = 2000,
}) => {
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: speed,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    );

    animation.start();

    return () => animation.stop();
  }, [speed, animatedValue]);

  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 300],
  });

  return (
    <View style={[styles.scanlinesContainer, style]} pointerEvents="none">
      <Animated.View
        style={[
          styles.scanline,
          {
            opacity: intensity,
            transform: [{ translateY }],
          },
        ]}
      />
    </View>
  );
};

// Glitch text effect
interface GlitchTextProps {
  children: string;
  style?: ViewStyle;
  size?: keyof typeof terminalTheme.typography.fontSize;
  color?: keyof typeof terminalTheme.colors.text;
  intensity?: number;
  speed?: number;
}

export const GlitchText: React.FC<GlitchTextProps> = ({
  children,
  style,
  size = 'base',
  color = 'primary',
  intensity = 0.1,
  speed = 100,
}) => {
  const [glitchedText, setGlitchedText] = React.useState(children);
  const [isGlitching, setIsGlitching] = React.useState(false);

  const glitchChars = '!@#$%^&*()_+-=[]{}|;:,.<>?~`';

  React.useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() < intensity) {
        setIsGlitching(true);
        
        // Create glitched version
        const chars = children.split('');
        const numGlitches = Math.floor(Math.random() * 3) + 1;
        
        for (let i = 0; i < numGlitches; i++) {
          const index = Math.floor(Math.random() * chars.length);
          chars[index] = glitchChars[Math.floor(Math.random() * glitchChars.length)];
        }
        
        setGlitchedText(chars.join(''));
        
        // Reset after short delay
        setTimeout(() => {
          setGlitchedText(children);
          setIsGlitching(false);
        }, 50);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [children, intensity, speed, glitchChars]);

  return (
    <TerminalText
      size={size}
      color={isGlitching ? 'error' : color}
      style={[
        style,
        isGlitching && styles.glitching,
      ]}
    >
      {glitchedText}
    </TerminalText>
  );
};

// Progress bar with ASCII art
interface TerminalProgressBarProps {
  progress: number; // 0-100
  width?: number;
  style?: ViewStyle;
  label?: string;
  showPercentage?: boolean;
}

export const TerminalProgressBar: React.FC<TerminalProgressBarProps> = ({
  progress,
  width = 30,
  style,
  label,
  showPercentage = true,
}) => {
  const filledWidth = Math.floor((progress / 100) * width);
  const emptyWidth = width - filledWidth;

  const progressBar = '█'.repeat(filledWidth) + '░'.repeat(emptyWidth);

  return (
    <View style={[styles.progressContainer, style]}>
      {label && (
        <TerminalText size="sm" color="secondary" style={styles.progressLabel}>
          {label}
        </TerminalText>
      )}
      <View style={styles.progressBarContainer}>
        <TerminalText color="accent">
          [{progressBar}]
        </TerminalText>
        {showPercentage && (
          <TerminalText size="sm" color="secondary" style={styles.progressPercentage}>
            {Math.round(progress)}%
          </TerminalText>
        )}
      </View>
    </View>
  );
};

// Command line prompt with blinking cursor
interface CommandPromptProps {
  command: string;
  onCommandChange: (command: string) => void;
  onExecute: (command: string) => void;
  style?: ViewStyle;
  prompt?: string;
  executing?: boolean;
}

export const CommandPrompt: React.FC<CommandPromptProps> = ({
  command,
  onCommandChange,
  onExecute,
  style,
  prompt = '$ ',
  executing = false,
}) => {
  const [showCursor, setShowCursor] = React.useState(true);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, terminalTheme.effects.cursor.blinkDuration);

    return () => clearInterval(interval);
  }, []);

  const handleKeyPress = (key: string) => {
    if (executing) return;

    if (key === 'Enter') {
      onExecute(command);
    } else if (key === 'Backspace') {
      onCommandChange(command.slice(0, -1));
    } else {
      onCommandChange(command + key);
    }
  };

  return (
    <View style={[styles.commandPrompt, style]}>
      <TerminalText color="prompt">
        {prompt}
      </TerminalText>
      <TerminalText color="primary">
        {command}
      </TerminalText>
      {!executing && showCursor && (
        <TerminalText color="accent">
          {terminalTheme.ascii.cursor}
        </TerminalText>
      )}
      {executing && (
        <ASCIILoader size="sm" />
      )}
    </View>
  );
};

// Boot sequence animation
interface BootSequenceProps {
  messages: string[];
  onComplete?: () => void;
  speed?: number;
  style?: ViewStyle;
}

export const BootSequence: React.FC<BootSequenceProps> = ({
  messages,
  onComplete,
  speed = 1000,
  style,
}) => {
  const [currentMessageIndex, setCurrentMessageIndex] = React.useState(0);
  const [visibleMessages, setVisibleMessages] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (currentMessageIndex >= messages.length) {
      onComplete?.();
      return;
    }

    const timeout = setTimeout(() => {
      setVisibleMessages(prev => [...prev, messages[currentMessageIndex]]);
      setCurrentMessageIndex(prev => prev + 1);
    }, speed);

    return () => clearTimeout(timeout);
  }, [currentMessageIndex, messages, speed, onComplete]);

  return (
    <View style={[styles.bootSequence, style]}>
      {visibleMessages.map((message, index) => (
        <View key={index} style={styles.bootMessage}>
          <TerminalText size="sm" color="accent">
            [OK]
          </TerminalText>
          <TerminalText size="sm" style={styles.bootMessageText}>
            {message}
          </TerminalText>
        </View>
      ))}
      {currentMessageIndex < messages.length && (
        <View style={styles.bootMessage}>
          <ASCIILoader size="sm" />
          <TerminalText size="sm" color="secondary" style={styles.bootMessageText}>
            Loading...
          </TerminalText>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  loader: {
    textAlign: 'center',
  },
  matrixContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  matrixDrop: {
    position: 'absolute',
  },
  scanlinesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  scanline: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: terminalTheme.colors.text.accent,
  },
  glitching: {
    // Additional glitch styling could be added here
  },
  progressContainer: {
    marginVertical: terminalTheme.spacing.xs,
  },
  progressLabel: {
    marginBottom: terminalTheme.spacing.xs,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressPercentage: {
    marginLeft: terminalTheme.spacing.sm,
    minWidth: 40,
  },
  commandPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: terminalTheme.spacing.sm,
    backgroundColor: terminalTheme.colors.surface,
    borderWidth: terminalTheme.borderWidth.thick,
    borderColor: terminalTheme.colors.border.primary,
  },
  bootSequence: {
    padding: terminalTheme.spacing.md,
  },
  bootMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: terminalTheme.spacing.xs,
  },
  bootMessageText: {
    marginLeft: terminalTheme.spacing.sm,
  },
});
