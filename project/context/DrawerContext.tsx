import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { DrawerItem } from '@/components/AnimatedDrawer';

type DrawerContextType = {
  isDrawerOpen: boolean;
  toggleDrawer: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  currentSection: string;
  setCurrentSection: (section: string) => void;
  drawerItems: DrawerItem[];
  setDrawerItems: (items: DrawerItem[]) => void;
  addDrawerItem: (item: DrawerItem, section?: string) => void;
  removeDrawerItem: (title: string) => void;
  updateDrawerItem: (title: string, updates: Partial<DrawerItem>) => void;
  searchDrawerItems: (query: string) => DrawerItem[];
  getDrawerItem: (title: string) => DrawerItem | undefined;
  clearDrawerItems: () => void;
  drawerTheme: 'light' | 'dark';
  setDrawerTheme: (theme: 'light' | 'dark') => void;
  enableHaptics: boolean;
  setEnableHaptics: (enable: boolean) => void;
  enableSearch: boolean;
  setEnableSearch: (enable: boolean) => void;
  enableSections: boolean;
  setEnableSections: (enable: boolean) => void;
};

const DrawerContext = createContext<DrawerContextType | undefined>(undefined);

type DrawerProviderProps = {
  children: ReactNode;
  initialItems?: DrawerItem[];
  initialTheme?: 'light' | 'dark';
  initialHaptics?: boolean;
  initialSearch?: boolean;
  initialSections?: boolean;
};

export const DrawerProvider: React.FC<DrawerProviderProps> = ({
  children,
  initialItems = [],
  initialTheme = 'light',
  initialHaptics = true,
  initialSearch = true,
  initialSections = true,
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [currentSection, setCurrentSection] = useState('main');
  const [drawerItems, setDrawerItems] = useState<DrawerItem[]>(initialItems);
  const [drawerTheme, setDrawerTheme] = useState<'light' | 'dark'>(initialTheme);
  const [enableHaptics, setEnableHaptics] = useState(initialHaptics);
  const [enableSearch, setEnableSearch] = useState(initialSearch);
  const [enableSections, setEnableSections] = useState(initialSections);

  const toggleDrawer = useCallback(() => {
    setIsDrawerOpen((prev: boolean) => !prev);
  }, []);

  const openDrawer = useCallback(() => {
    setIsDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
  }, []);

  const addDrawerItem = useCallback((item: DrawerItem, section?: string) => {
    setDrawerItems((prev: DrawerItem[]) => [...prev, item]);
    if (section) {
      setCurrentSection(section);
    }
  }, []);

  const removeDrawerItem = useCallback((title: string) => {
    setDrawerItems((prev: DrawerItem[]) => prev.filter((item: DrawerItem) => item.title !== title));
  }, []);

  const updateDrawerItem = useCallback((title: string, updates: Partial<DrawerItem>) => {
    setDrawerItems((prev: DrawerItem[]) => 
      prev.map((item: DrawerItem) => 
        item.title === title ? { ...item, ...updates } : item
      )
    );
  }, []);

  const searchDrawerItems = useCallback((query: string): DrawerItem[] => {
    if (!query.trim()) return drawerItems;
    
    return drawerItems.filter((item: DrawerItem) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(query.toLowerCase())
    );
  }, [drawerItems]);

  const getDrawerItem = useCallback((title: string): DrawerItem | undefined => {
    return drawerItems.find((item: DrawerItem) => item.title === title);
  }, [drawerItems]);

  const clearDrawerItems = useCallback(() => {
    setDrawerItems([]);
  }, []);

  const value: DrawerContextType = {
    isDrawerOpen,
    toggleDrawer,
    openDrawer,
    closeDrawer,
    currentSection,
    setCurrentSection,
    drawerItems,
    setDrawerItems,
    addDrawerItem,
    removeDrawerItem,
    updateDrawerItem,
    searchDrawerItems,
    getDrawerItem,
    clearDrawerItems,
    drawerTheme,
    setDrawerTheme,
    enableHaptics,
    setEnableHaptics,
    enableSearch,
    setEnableSearch,
    enableSections,
    setEnableSections,
  };

  return (
    <DrawerContext.Provider value={value}>
      {children}
    </DrawerContext.Provider>
  );
};

export const useDrawer = (): DrawerContextType => {
  const context = useContext(DrawerContext);
  if (context === undefined) {
    throw new Error('useDrawer must be used within a DrawerProvider');
  }
  return context;
};

// Hook for drawer item management
export const useDrawerItems = () => {
  const {
    drawerItems,
    addDrawerItem,
    removeDrawerItem,
    updateDrawerItem,
    searchDrawerItems,
    getDrawerItem,
    clearDrawerItems,
  } = useDrawer();

  return {
    items: drawerItems,
    add: addDrawerItem,
    remove: removeDrawerItem,
    update: updateDrawerItem,
    search: searchDrawerItems,
    get: getDrawerItem,
    clear: clearDrawerItems,
  };
};

// Hook for drawer settings
export const useDrawerSettings = () => {
  const {
    drawerTheme,
    setDrawerTheme,
    enableHaptics,
    setEnableHaptics,
    enableSearch,
    setEnableSearch,
    enableSections,
    setEnableSections,
  } = useDrawer();

  return {
    theme: drawerTheme,
    setTheme: setDrawerTheme,
    haptics: enableHaptics,
    setHaptics: setEnableHaptics,
    search: enableSearch,
    setSearch: setEnableSearch,
    sections: enableSections,
    setSections: setEnableSections,
  };
}; 