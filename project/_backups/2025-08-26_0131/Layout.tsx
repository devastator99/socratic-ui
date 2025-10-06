/**
 * Terminal Layout Components
 * Brutalist terminal-inspired layout components with ASCII borders and window chrome
 */

import React from 'react';
import { 
  View, 
  ScrollView, 
  StyleSheet, 
  ViewStyle, 
  ScrollViewProps,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { terminalTheme } from '../../theme';
import { TerminalText, TerminalHeader } from './Typography';

// Terminal window container with ASCII borders
interface TerminalWindowProps {
  children: React.ReactNode;
  title?: string;
  style?: ViewStyle;
  showBorder?: boolean;
  showTitleBar?: boolean;
}

export const TerminalWindow: React.FC<TerminalWindowProps> = ({
  children,
  title,
  style,
  showBorder = true,
  showTitleBar = true,
}) => {
  return (
    <View style={[styles.terminalWindow, showBorder && styles.windowBorder, style]}>
      {showTitleBar && (
        <View style={styles.titleBar}>
          <View style={styles.windowControls}>
            <TerminalText size="sm" color="error">[×]</TerminalText>
            <TerminalText size="sm" color="warning">[−]</TerminalText>
            <TerminalText size="sm" color="accent">[□]</TerminalText>
          </View>
          {title && (
            <TerminalText size="sm" style={styles.windowTitle}>
              {title}
            </TerminalText>
          )}
        </View>
      )}
      <View style={styles.windowContent}>
        {children}
      </View>
    </View>
  );
};

// Main screen container
interface TerminalScreenProps {
  children: React.ReactNode;
  title?: string;
  style?: ViewStyle;
  padding?: keyof typeof terminalTheme.spacing;
  showHeader?: boolean;
}

export const TerminalScreen: React.FC<TerminalScreenProps> = ({
  children,
  title,
  style,
  padding = 'md',
  showHeader = true,
}) => {
  return (
    <SafeAreaView style={[styles.screen, style]}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor={terminalTheme.colors.background}
      />
      
      {showHeader && title && (
        <View style={styles.screenHeader}>
          <TerminalHeader level={1}>
            {title}
          </TerminalHeader>
          <View style={styles.headerBorder} />
        </View>
      )}
      
      <View style={[
        styles.screenContent, 
        { padding: terminalTheme.spacing[padding] }
      ]}>
        {children}
      </View>
    </SafeAreaView>
  );
};

// Terminal panel with ASCII borders
interface TerminalPanelProps {
  children: React.ReactNode;
  title?: string;
  style?: ViewStyle;
  collapsible?: boolean;
  initialCollapsed?: boolean;
}

export const TerminalPanel: React.FC<TerminalPanelProps> = ({
  children,
  title,
  style,
  collapsible = false,
  initialCollapsed = false,
}) => {
  const [collapsed, setCollapsed] = React.useState(initialCollapsed);

  const toggleCollapsed = () => {
    if (collapsible) {
      setCollapsed(!collapsed);
    }
  };

  return (
    <View style={[styles.panel, style]}>
      {title && (
        <View style={styles.panelHeader}>
          <TerminalText 
            size="sm" 
            color="accent"
            onPress={toggleCollapsed}
          >
            {collapsible ? (collapsed ? '▶ ' : '▼ ') : '■ '}{title}
          </TerminalText>
        </View>
      )}
      
      {!collapsed && (
        <View style={styles.panelContent}>
          {children}
        </View>
      )}
    </View>
  );
};

// Terminal grid layout
interface TerminalGridProps {
  children: React.ReactNode;
  columns?: number;
  spacing?: keyof typeof terminalTheme.spacing;
  style?: ViewStyle;
}

export const TerminalGrid: React.FC<TerminalGridProps> = ({
  children,
  columns = 2,
  spacing = 'md',
  style,
}) => {
  const gap = terminalTheme.spacing[spacing];
  
  return (
    <View style={[styles.grid, { gap }, style]}>
      {React.Children.map(children, (child, index) => (
        <View 
          key={index}
          style={[
            styles.gridItem,
            { width: `${100 / columns}%` },
          ]}
        >
          {child}
        </View>
      ))}
    </View>
  );
};

// Terminal list container
interface TerminalListProps extends ScrollViewProps {
  children: React.ReactNode;
  spacing?: keyof typeof terminalTheme.spacing;
}

export const TerminalList: React.FC<TerminalListProps> = ({
  children,
  spacing = 'sm',
  style,
  ...scrollProps
}) => {
  const gap = terminalTheme.spacing[spacing];
  
  return (
    <ScrollView 
      {...scrollProps}
      style={[styles.list, style]}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ gap }}>
        {children}
      </View>
    </ScrollView>
  );
};

// Terminal card component
interface TerminalCardProps {
  children: React.ReactNode;
  title?: string;
  style?: ViewStyle;
  variant?: 'default' | 'accent' | 'warning' | 'error';
  interactive?: boolean;
  onPress?: () => void;
}

export const TerminalCard: React.FC<TerminalCardProps> = ({
  children,
  title,
  style,
  variant = 'default',
  interactive = false,
  onPress,
}) => {
  const borderColor = {
    default: terminalTheme.colors.border.primary,
    accent: terminalTheme.colors.border.accent,
    warning: terminalTheme.colors.text.warning,
    error: terminalTheme.colors.border.error,
  }[variant];

  const cardStyle: ViewStyle = {
    borderWidth: terminalTheme.borderWidth.thick,
    borderColor,
    backgroundColor: terminalTheme.colors.surface,
    padding: terminalTheme.spacing.md,
  };

  const CardContainer = interactive ? View : View; // TODO: Make pressable if interactive

  return (
    <CardContainer style={[cardStyle, style]}>
      {title && (
        <View style={styles.cardHeader}>
          <TerminalText size="lg" weight="bold" color={variant === 'default' ? 'primary' : variant as any}>
            {title}
          </TerminalText>
          <View style={[styles.cardHeaderBorder, { borderColor }]} />
        </View>
      )}
      <View style={styles.cardContent}>
        {children}
      </View>
    </CardContainer>
  );
};

// Terminal separator
interface TerminalSeparatorProps {
  style?: ViewStyle;
  character?: string;
  length?: number;
}

export const TerminalSeparator: React.FC<TerminalSeparatorProps> = ({
  style,
  character = terminalTheme.ascii.borders.horizontal,
  length = 40,
}) => {
  return (
    <TerminalText color="secondary" style={[styles.separator, style]}>
      {character.repeat(length)}
    </TerminalText>
  );
};

// Terminal status bar
interface TerminalStatusBarProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const TerminalStatusBar: React.FC<TerminalStatusBarProps> = ({
  children,
  style,
}) => {
  return (
    <View style={[styles.statusBar, style]}>
      {children}
    </View>
  );
};

// Terminal sidebar
interface TerminalSidebarProps {
  children: React.ReactNode;
  width?: number;
  side?: 'left' | 'right';
  style?: ViewStyle;
  collapsible?: boolean;
}

export const TerminalSidebar: React.FC<TerminalSidebarProps> = ({
  children,
  width = 250,
  side = 'left',
  style,
  collapsible = false,
}) => {
  const [collapsed, setCollapsed] = React.useState(false);

  const sidebarStyle: ViewStyle = {
    width: collapsed ? 0 : width,
    borderRightWidth: side === 'left' ? terminalTheme.borderWidth.thick : 0,
    borderLeftWidth: side === 'right' ? terminalTheme.borderWidth.thick : 0,
    borderColor: terminalTheme.colors.border.secondary,
  };

  return (
    <View style={[styles.sidebar, sidebarStyle, style]}>
      {!collapsed && children}
      {collapsible && (
        <View style={styles.sidebarToggle}>
          <TerminalText 
            size="sm" 
            onPress={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (side === 'left' ? '▶' : '◀') : (side === 'left' ? '◀' : '▶')}
          </TerminalText>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  terminalWindow: {
    backgroundColor: terminalTheme.colors.surface,
  },
  windowBorder: {
    borderWidth: terminalTheme.borderWidth.thick,
    borderColor: terminalTheme.colors.border.primary,
  },
  titleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: terminalTheme.spacing.sm,
    borderBottomWidth: terminalTheme.borderWidth.thin,
    borderBottomColor: terminalTheme.colors.border.secondary,
    backgroundColor: terminalTheme.colors.surfaceElevated,
  },
  windowControls: {
    flexDirection: 'row',
    gap: terminalTheme.spacing.xs,
  },
  windowTitle: {
    flex: 1,
    textAlign: 'center',
  },
  windowContent: {
    flex: 1,
  },
  screen: {
    flex: 1,
    backgroundColor: terminalTheme.colors.background,
  },
  screenHeader: {
    paddingHorizontal: terminalTheme.spacing.md,
    paddingTop: terminalTheme.spacing.md,
  },
  headerBorder: {
    height: terminalTheme.borderWidth.thick,
    backgroundColor: terminalTheme.colors.border.accent,
    marginTop: terminalTheme.spacing.sm,
  },
  screenContent: {
    flex: 1,
  },
  panel: {
    borderWidth: terminalTheme.borderWidth.thick,
    borderColor: terminalTheme.colors.border.secondary,
    backgroundColor: terminalTheme.colors.surface,
    marginVertical: terminalTheme.spacing.xs,
  },
  panelHeader: {
    padding: terminalTheme.spacing.sm,
    borderBottomWidth: terminalTheme.borderWidth.thin,
    borderBottomColor: terminalTheme.colors.border.secondary,
    backgroundColor: terminalTheme.colors.surfaceElevated,
  },
  panelContent: {
    padding: terminalTheme.spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridItem: {
    paddingHorizontal: terminalTheme.spacing.xs,
  },
  list: {
    flex: 1,
  },
  cardHeader: {
    marginBottom: terminalTheme.spacing.sm,
  },
  cardHeaderBorder: {
    height: terminalTheme.borderWidth.thin,
    marginTop: terminalTheme.spacing.xs,
  },
  cardContent: {
    // Content styling handled by children
  },
  separator: {
    textAlign: 'center',
    marginVertical: terminalTheme.spacing.sm,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: terminalTheme.spacing.sm,
    borderTopWidth: terminalTheme.borderWidth.thick,
    borderTopColor: terminalTheme.colors.border.secondary,
    backgroundColor: terminalTheme.colors.surfaceElevated,
  },
  sidebar: {
    backgroundColor: terminalTheme.colors.surface,
    position: 'relative',
  },
  sidebarToggle: {
    position: 'absolute',
    top: terminalTheme.spacing.md,
    right: -terminalTheme.spacing.md,
    padding: terminalTheme.spacing.xs,
    backgroundColor: terminalTheme.colors.surfaceElevated,
    borderWidth: terminalTheme.borderWidth.thin,
    borderColor: terminalTheme.colors.border.secondary,
  },
});
