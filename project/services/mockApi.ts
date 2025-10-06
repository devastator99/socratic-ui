// Mock API for books and user authentication
import AsyncStorage from '@react-native-async-storage/async-storage';
import { books } from '@/data/books';

// Simulate a user database
const USERS_KEY = 'MOCK_USERS';
const SESSION_KEY = 'MOCK_SESSION';
const FAVORITES_KEY = 'MOCK_FAVORITES';
const BOOKMARKS_KEY = 'MOCK_BOOKMARKS';

export type User = {
  id: string;
  email: string;
  password: string;
  name: string;
};

export async function signup(email: string, password: string, name: string) {
  const usersRaw = await AsyncStorage.getItem(USERS_KEY);
  const users: User[] = usersRaw ? JSON.parse(usersRaw) : [];
  if (users.find((u) => u.email === email)) {
    throw new Error('User already exists');
  }
  const newUser: User = { id: Date.now().toString(), email, password, name };
  users.push(newUser);
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(newUser));
  return newUser;
}

export async function login(email: string, password: string) {
  const usersRaw = await AsyncStorage.getItem(USERS_KEY);
  const users: User[] = usersRaw ? JSON.parse(usersRaw) : [];
  const user = users.find((u) => u.email === email && u.password === password);
  if (!user) throw new Error('Invalid credentials');
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(user));
  return user;
}

export async function logout() {
  await AsyncStorage.removeItem(SESSION_KEY);
}

export async function getCurrentUser(): Promise<User | null> {
  const userRaw = await AsyncStorage.getItem(SESSION_KEY);
  return userRaw ? JSON.parse(userRaw) : null;
}

export async function getBooks() {
  // Simulate network delay
  await new Promise((res) => setTimeout(res, 300));
  return books;
}

export async function getUserFavorites(userId: string): Promise<string[]> {
  const favsRaw = await AsyncStorage.getItem(`${FAVORITES_KEY}_${userId}`);
  return favsRaw ? JSON.parse(favsRaw) : [];
}

export async function setUserFavorites(userId: string, favorites: string[]) {
  await AsyncStorage.setItem(`${FAVORITES_KEY}_${userId}`, JSON.stringify(favorites));
}

export async function getUserBookmarks(userId: string): Promise<string[]> {
  const bmsRaw = await AsyncStorage.getItem(`${BOOKMARKS_KEY}_${userId}`);
  return bmsRaw ? JSON.parse(bmsRaw) : [];
}

export async function setUserBookmarks(userId: string, bookmarks: string[]) {
  await AsyncStorage.setItem(`${BOOKMARKS_KEY}_${userId}`, JSON.stringify(bookmarks));
} 