/**
 * Terminal Input Components
 * Brutalist terminal-inspired input components with sharp edges and monospace fonts
 */

import React from 'react';
import { 
  TextInput, 
  View, 
  StyleSheet, 
  ViewStyle, 
  TextInputProps,
  TouchableOpacity,
} from 'react-native';
import { terminalTheme } from '../../theme';
import { TerminalText, PromptText, BlinkingCursor } from './Typography';

interface BaseInputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  hint?: string;
  style?: ViewStyle;
  inputStyle?: ViewStyle;
  showPrompt?: boolean;
  promptText?: string;
  bordered?: boolean;
}

const BaseInput: React.FC<BaseInputProps> = ({
  label,
  error,
  hint,
  style,
  inputStyle,
  showPrompt = false,
  promptText = terminalTheme.ascii.prompt,
  bordered = true,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  ...props
}) => {
  const [focused, setFocused] = React.useState(false);

  const containerStyle: ViewStyle = {
    ...(bordered && {
      borderWidth: terminalTheme.borderWidth.thick,
      borderColor: error 
        ? terminalTheme.colors.border.error 
        : focused 
          ? terminalTheme.colors.input.focus
          : terminalTheme.colors.input.border,
    }),
    backgroundColor: terminalTheme.colors.input.background,
    padding: terminalTheme.spacing.sm,
  };

  const textInputStyle: ViewStyle = {
    fontFamily: terminalTheme.typography.fontFamily.mono,
    fontSize: terminalTheme.typography.fontSize.base,
    color: terminalTheme.colors.input.text,
    padding: 0,
    margin: 0,
    ...(multiline && { textAlignVertical: 'top' }),
  };

  return (
    <View style={[styles.container, style]}>
      {label && (
        <TerminalText 
          size="sm" 
          color="secondary" 
          style={styles.label}
        >
          {label}
        </TerminalText>
      )}
      
      <View style={[containerStyle, styles.inputContainer]}>
        {showPrompt && (
          <PromptText style={styles.prompt}>
            {promptText}
          </PromptText>
        )}
        
        <TextInput
          {...props}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={terminalTheme.colors.input.placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[textInputStyle, inputStyle]}
          multiline={multiline}
          selectionColor={terminalTheme.colors.input.focus}
        />
      </View>

      {error && (
        <TerminalText 
          size="sm" 
          color="error" 
          style={styles.error}
        >
          ERROR: {error}
        </TerminalText>
      )}

      {hint && !error && (
        <TerminalText 
          size="sm" 
          color="secondary" 
          style={styles.hint}
        >
          {hint}
        </TerminalText>
      )}
    </View>
  );
};

// Semantic input variants
export const TerminalInput = BaseInput;

export const PromptInput: React.FC<Omit<BaseInputProps, 'showPrompt'>> = (props) => (
  <BaseInput {...props} showPrompt />
);

// Command line input
interface CommandInputProps extends Omit<BaseInputProps, 'showPrompt' | 'promptText'> {
  onCommand?: (command: string) => void;
  commandHistory?: string[];
}

export const CommandInput: React.FC<CommandInputProps> = ({
  onCommand,
  commandHistory = [],
  value,
  onChangeText,
  ...props
}) => {
  const [historyIndex, setHistoryIndex] = React.useState(-1);

  const handleKeyPress = (e: any) => {
    if (e.nativeEvent.key === 'Enter' && value?.trim()) {
      onCommand?.(value.trim());
      onChangeText?.('');
      setHistoryIndex(-1);
    }
  };

  return (
    <BaseInput
      {...props}
      value={value}
      onChangeText={onChangeText}
      onKeyPress={handleKeyPress}
      showPrompt
      promptText="$ "
      placeholder="Enter command..."
    />
  );
};

// Search input with terminal styling
interface SearchInputProps extends Omit<BaseInputProps, 'showPrompt' | 'promptText'> {
  onSearch?: (query: string) => void;
  searching?: boolean;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  onSearch,
  searching = false,
  value,
  onChangeText,
  ...props
}) => {
  const handleSubmit = () => {
    if (value?.trim()) {
      onSearch?.(value.trim());
    }
  };

  return (
    <View style={styles.searchContainer}>
      <BaseInput
        {...props}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={handleSubmit}
        showPrompt
        promptText="? "
        placeholder="Search..."
        style={styles.searchInput}
      />
      {searching && (
        <View style={styles.searchingIndicator}>
          <TerminalText size="sm" color="accent">
            SEARCHING...
          </TerminalText>
          <BlinkingCursor />
        </View>
      )}
    </View>
  );
};

// Multi-line code input
interface CodeInputProps extends Omit<BaseInputProps, 'multiline'> {
  language?: string;
  lineNumbers?: boolean;
}

export const CodeInput: React.FC<CodeInputProps> = ({
  language,
  lineNumbers = false,
  value,
  style,
  ...props
}) => {
  const lines = value?.split('\n') || [''];

  return (
    <View style={[styles.codeContainer, style]}>
      {language && (
        <View style={styles.codeHeader}>
          <TerminalText size="sm" color="accent">
            [{language.toUpperCase()}]
          </TerminalText>
        </View>
      )}
      
      <View style={styles.codeInputContainer}>
        {lineNumbers && (
          <View style={styles.lineNumbers}>
            {lines.map((_, index) => (
              <TerminalText 
                key={index}
                size="sm" 
                color="secondary"
                style={styles.lineNumber}
              >
                {(index + 1).toString().padStart(3, ' ')}
              </TerminalText>
            ))}
          </View>
        )}
        
        <BaseInput
          {...props}
          value={value}
          multiline
          bordered={false}
          style={styles.codeInput}
        />
      </View>
    </View>
  );
};

// Toggle input (checkbox style)
interface ToggleInputProps {
  label: string;
  value: boolean;
  onToggle: (value: boolean) => void;
  style?: ViewStyle;
}

export const ToggleInput: React.FC<ToggleInputProps> = ({
  label,
  value,
  onToggle,
  style,
}) => {
  return (
    <TouchableOpacity 
      style={[styles.toggleInput, style]}
      onPress={() => onToggle(!value)}
    >
      <TerminalText>
        [{value ? 'X' : ' '}] {label}
      </TerminalText>
    </TouchableOpacity>
  );
};

// Select input (dropdown style)
interface SelectInputProps {
  label?: string;
  value: string;
  options: { label: string; value: string }[];
  onSelect: (value: string) => void;
  style?: ViewStyle;
}

export const SelectInput: React.FC<SelectInputProps> = ({
  label,
  value,
  options,
  onSelect,
  style,
}) => {
  const [expanded, setExpanded] = React.useState(false);
  const selectedOption = options.find(opt => opt.value === value);

  return (
    <View style={[styles.selectContainer, style]}>
      {label && (
        <TerminalText size="sm" color="secondary" style={styles.label}>
          {label}
        </TerminalText>
      )}
      
      <TouchableOpacity
        style={styles.selectTrigger}
        onPress={() => setExpanded(!expanded)}
      >
        <TerminalText>
          {selectedOption?.label || 'Select option...'} {expanded ? '▲' : '▼'}
        </TerminalText>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.selectOptions}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.selectOption,
                option.value === value && styles.selectOptionActive,
              ]}
              onPress={() => {
                onSelect(option.value);
                setExpanded(false);
              }}
            >
              <TerminalText
                color={option.value === value ? 'accent' : 'primary'}
              >
                {option.value === value ? '> ' : '  '}{option.label}
              </TerminalText>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: terminalTheme.spacing.xs,
  },
  label: {
    marginBottom: terminalTheme.spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  prompt: {
    marginRight: terminalTheme.spacing.xs,
    paddingTop: 0,
  },
  error: {
    marginTop: terminalTheme.spacing.xs,
  },
  hint: {
    marginTop: terminalTheme.spacing.xs,
  },
  searchContainer: {
    position: 'relative',
  },
  searchInput: {
    flex: 1,
  },
  searchingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    right: terminalTheme.spacing.sm,
    top: '50%',
    transform: [{ translateY: -10 }],
  },
  codeContainer: {
    borderWidth: terminalTheme.borderWidth.thick,
    borderColor: terminalTheme.colors.border.primary,
  },
  codeHeader: {
    padding: terminalTheme.spacing.xs,
    borderBottomWidth: terminalTheme.borderWidth.thin,
    borderBottomColor: terminalTheme.colors.border.secondary,
  },
  codeInputContainer: {
    flexDirection: 'row',
  },
  lineNumbers: {
    paddingVertical: terminalTheme.spacing.sm,
    paddingHorizontal: terminalTheme.spacing.xs,
    borderRightWidth: terminalTheme.borderWidth.thin,
    borderRightColor: terminalTheme.colors.border.secondary,
    backgroundColor: terminalTheme.colors.surfaceElevated,
  },
  lineNumber: {
    height: terminalTheme.typography.fontSize.base * terminalTheme.typography.lineHeight.normal,
    textAlign: 'right',
  },
  codeInput: {
    flex: 1,
  },
  toggleInput: {
    paddingVertical: terminalTheme.spacing.sm,
  },
  selectContainer: {
    position: 'relative',
  },
  selectTrigger: {
    borderWidth: terminalTheme.borderWidth.thick,
    borderColor: terminalTheme.colors.border.primary,
    backgroundColor: terminalTheme.colors.input.background,
    padding: terminalTheme.spacing.sm,
  },
  selectOptions: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 1000,
    borderWidth: terminalTheme.borderWidth.thick,
    borderColor: terminalTheme.colors.border.primary,
    backgroundColor: terminalTheme.colors.background,
    maxHeight: 200,
  },
  selectOption: {
    padding: terminalTheme.spacing.sm,
    borderBottomWidth: terminalTheme.borderWidth.thin,
    borderBottomColor: terminalTheme.colors.border.secondary,
  },
  selectOptionActive: {
    backgroundColor: terminalTheme.colors.surfaceElevated,
  },
});
