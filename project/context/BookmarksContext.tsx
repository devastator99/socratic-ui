import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Book } from '@/types/book';

type BookmarksContextType = {
  bookmarks: string[];
  toggleBookmark: (bookId: string) => Promise<void>;
  isBookmarked: (bookId: string) => boolean;
};

const BookmarksContext = createContext<BookmarksContextType>({
  bookmarks: [],
  toggleBookmark: async () => {},
  isBookmarked: () => false,
});

export const useBookmarks = () => useContext(BookmarksContext);

export const BookmarksProvider = ({ children }: { children: React.ReactNode }) => {
  const [bookmarks, setBookmarks] = useState<string[]>([]);

  useEffect(() => {
    const loadBookmarks = async () => {
      try {
        const stored = await AsyncStorage.getItem('@bookmarks');
        if (stored) setBookmarks(JSON.parse(stored));
      } catch (error) {
        console.error('Failed to load bookmarks', error);
      }
    };
    
    loadBookmarks();
  }, []);

  const toggleBookmark = async (bookId: string) => {
    try {
      const newBookmarks = bookmarks.includes(bookId)
        ? bookmarks.filter(id => id !== bookId)
        : [...bookmarks, bookId];
      
      setBookmarks(newBookmarks);
      await AsyncStorage.setItem('@bookmarks', JSON.stringify(newBookmarks));
    } catch (error) {
      console.error('Failed to save bookmark', error);
    }
  };

  const isBookmarked = (bookId: string) => bookmarks.includes(bookId);

  return (
    <BookmarksContext.Provider value={{ bookmarks, toggleBookmark, isBookmarked }}>
      {children}
    </BookmarksContext.Provider>
  );
};
