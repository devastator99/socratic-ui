import { Book } from '@/types/book';

export interface AutoTagResult {
  tags: string[];
  predictedGenre?: string;
}

export interface AIRecommendation {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  matchScore: number;
  reason: string;
}

export interface BookSummary {
  id: string;
  summary: string;
  keyThemes: string[];
  readingTime: number;
  complexity: 'beginner' | 'intermediate' | 'advanced';
}

export interface ReadingInsight {
  totalBooks: number;
  averageRating: number;
  favoriteGenres: string[];
  readingStreak: number;
  monthlyGoal: number;
  monthlyProgress: number;
  readingSpeed: number; // pages per hour
  preferredLength: 'short' | 'medium' | 'long';
  moodTrends: { mood: string; count: number }[];
}

export interface MoodRecommendation {
  mood: string;
  books: Book[];
  description: string;
  color: string;
  icon: string;
}

class AIService {
  private baseUrl = 'http://localhost:8000'; // Backend URL
  private aiWorkerUrl = 'https://your-ai-worker.workers.dev'; // AI Worker URL

  // AI-Powered Book Recommendations
  async getPersonalizedRecommendations(
    userBooks: Book[],
    preferences?: { genres: string[]; authors: string[]; ratings: number[] }
  ): Promise<AIRecommendation[]> {
    try {
      // Simulate AI recommendation logic
      const allBooks = await this.getAllBooks();
      const unreadBooks = allBooks.filter(book => 
        !userBooks.some(userBook => userBook.id === book.id)
      );

      const recommendations: AIRecommendation[] = [];

      // Genre-based recommendations
      const favoriteGenres = this.getFavoriteGenres(userBooks);
      const genreMatches = unreadBooks
        .filter(book => favoriteGenres.includes(book.genre))
        .slice(0, 3)
        .map(book => ({
          id: book.id,
          title: book.title,
          author: book.author,
          coverUrl: book.coverUrl,
          matchScore: 0.85 + Math.random() * 0.1,
          reason: `Based on your love for ${book.genre} books`
        }));

      // Author-based recommendations
      const favoriteAuthors = this.getFavoriteAuthors(userBooks);
      const authorMatches = unreadBooks
        .filter(book => favoriteAuthors.includes(book.author))
        .slice(0, 2)
        .map(book => ({
          id: book.id,
          title: book.title,
          author: book.author,
          coverUrl: book.coverUrl,
          matchScore: 0.9 + Math.random() * 0.05,
          reason: `You enjoyed other books by ${book.author}`
        }));

      // Rating-based recommendations
      const highRatedBooks = unreadBooks
        .filter(book => book.rating && book.rating >= 4.5)
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 3)
        .map(book => ({
          id: book.id,
          title: book.title,
          author: book.author,
          coverUrl: book.coverUrl,
          matchScore: 0.8 + Math.random() * 0.1,
          reason: `Highly rated book (${book.rating}★) that matches your taste`
        }));

      recommendations.push(...genreMatches, ...authorMatches, ...highRatedBooks);
      
      return recommendations
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 8);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      // Return mock data as fallback
      return this.generateMockRecommendations(userBooks);
    }
  }

  // AI Book Summaries
  async getBookSummary(bookId: string): Promise<BookSummary | null> {
    try {
      // In a real implementation, this would call your AI worker
      const response = await fetch(`${this.aiWorkerUrl}/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: bookId,
          text: `Generate a summary for book ID: ${bookId}`
        })
      });

      if (!response.ok) {
        // Fallback to mock data
        return this.getMockSummary(bookId);
      }

      const data = await response.json();
      return {
        id: bookId,
        summary: data.summary,
        keyThemes: this.extractThemes(data.summary),
        readingTime: Math.floor(Math.random() * 8) + 2, // 2-10 hours
        complexity: this.determineComplexity(data.summary)
      };
    } catch (error) {
      console.error('Error getting book summary:', error);
      return this.getMockSummary(bookId);
    }
  }

  // Auto-tagging & Genre Classification
async autoTagBook(book: Book): Promise<AutoTagResult> {
  try {
    const response = await fetch(`${this.aiWorkerUrl}/auto-tag`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: book.title,
        author: book.author,
        description: book.description,
        genre: book.genre,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        tags: data.tags || this.extractThemes(book.description || book.title),
        predictedGenre: data.genre || undefined,
      };
    }
    // fallback mock
    return {
      tags: this.extractThemes(book.description || book.title),
    };
  } catch (error) {
    console.error('Error auto-tagging book:', error);
    return {
      tags: this.extractThemes(book.description || book.title),
    };
  }
}

// Semantic Search
  async semanticSearch(query: string, books: Book[]): Promise<Book[]> {
    try {
      // Simulate semantic search with keyword matching and AI understanding
      const normalizedQuery = query.toLowerCase();
      
      // Enhanced search that understands context
      const searchResults = books.filter(book => {
        const searchText = `${book.title} ${book.author} ${book.genre} ${book.description || ''}`.toLowerCase();
        
        // Direct keyword match
        if (searchText.includes(normalizedQuery)) return true;
        
        // Semantic understanding (simplified)
        const semanticMatches = this.getSemanticMatches(normalizedQuery);
        return semanticMatches.some(match => searchText.includes(match));
      });

      // Sort by relevance
      return searchResults.sort((a, b) => {
        const aRelevance = this.calculateRelevance(a, normalizedQuery);
        const bRelevance = this.calculateRelevance(b, normalizedQuery);
        return bRelevance - aRelevance;
      });
    } catch (error) {
      console.error('Error in semantic search:', error);
      return books.filter(book => 
        book.title.toLowerCase().includes(query.toLowerCase()) ||
        book.author.toLowerCase().includes(query.toLowerCase())
      );
    }
  }

  // Reading Insights & Analytics
  async getReadingInsights(userBooks: Book[]): Promise<ReadingInsight> {
    const completedBooks = userBooks.filter((book: any) => book.status === 'completed');
    const inProgressBooks = userBooks.filter((book: any) => book.status === 'in-progress');
    
    const totalRating = completedBooks.reduce((sum, book) => sum + (book.rating || 0), 0);
    const averageRating = completedBooks.length > 0 ? totalRating / completedBooks.length : 0;
    
    const genreCounts = completedBooks.reduce((acc, book) => {
      acc[book.genre] = (acc[book.genre] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const favoriteGenres = Object.entries(genreCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([genre]) => genre);

    return {
      totalBooks: completedBooks.length,
      averageRating: Math.round(averageRating * 10) / 10,
      favoriteGenres,
      readingStreak: Math.floor(Math.random() * 30) + 1, // Mock streak
      monthlyGoal: 4,
      monthlyProgress: completedBooks.length % 4,
      readingSpeed: Math.floor(Math.random() * 20) + 25, // 25-45 pages/hour
      preferredLength: this.determinePreferredLength(completedBooks),
      moodTrends: this.generateMoodTrends()
    };
  }

  // Mood-Based Recommendations
  async getMoodRecommendations(): Promise<MoodRecommendation[]> {
    const moods: MoodRecommendation[] = [
      {
        mood: 'Adventurous',
        books: [], // Will be populated
        description: 'Ready for epic journeys and thrilling quests',
        color: '#FF6B35',
        icon: '🗺️'
      },
      {
        mood: 'Contemplative',
        books: [],
        description: 'In the mood for deep thoughts and philosophy',
        color: '#6B73FF',
        icon: '🤔'
      },
      {
        mood: 'Romantic',
        books: [],
        description: 'Looking for love stories and emotional connections',
        color: '#FF69B4',
        icon: '💕'
      },
      {
        mood: 'Mysterious',
        books: [],
        description: 'Craving puzzles, secrets, and plot twists',
        color: '#8B4513',
        icon: '🔍'
      },
      {
        mood: 'Uplifting',
        books: [],
        description: 'Need something positive and inspiring',
        color: '#32CD32',
        icon: '🌟'
      },
      {
        mood: 'Nostalgic',
        books: [],
        description: 'Yearning for classic tales and timeless stories',
        color: '#DDA0DD',
        icon: '📚'
      }
    ];

    // Populate with relevant books (mock implementation)
    const allBooks = await this.getAllBooks();
    moods.forEach(mood => {
      mood.books = allBooks
        .filter(book => this.matchesMood(book, mood.mood))
        .slice(0, 6);
    });

    return moods;
  }

  // Helper methods
  private getFavoriteGenres(books: Book[]): string[] {
    const genreCounts = books.reduce((acc, book) => {
      acc[book.genre] = (acc[book.genre] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(genreCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([genre]) => genre);
  }

  private getFavoriteAuthors(books: Book[]): string[] {
    const authorCounts = books.reduce((acc, book) => {
      acc[book.author] = (acc[book.author] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(authorCounts)
      .filter(([,count]) => count > 1)
      .map(([author]) => author);
  }

  private async getAllBooks(): Promise<Book[]> {
    // This would typically fetch from your backend
    // For now, return mock data to avoid dynamic import issues
    return [
      {
        id: '1',
        title: 'The Great Adventure',
        author: 'John Smith',
        genre: 'Adventure',
        rating: 4.5,
        pages: 320,
        publicationYear: 2020,
        coverImage: '',
        coverUrl: '',
        description: 'An epic adventure story',
        isbn: '123456789',
        publishYear: 2020,
        status: 'available',
        addedDate: Date.now(),
        popularity: 0,
        isPremium: false
      },
      {
        id: '2',
        title: 'Mystery of the Lost City',
        author: 'Jane Doe',
        genre: 'Mystery',
        rating: 4.2,
        pages: 280,
        publicationYear: 2019,
        coverImage: '',
        coverUrl: '',
        description: 'A thrilling mystery',
        isbn: '987654321',
        publishYear: 2019,
        status: 'available',
        addedDate: Date.now(),
        popularity: 0,
        isPremium: false
      }
    ];
  }

  private getMockSummary(bookId: string): BookSummary {
    const summaries = [
      "A captivating tale that explores the depths of human nature through compelling characters and intricate plot development.",
      "An intellectually stimulating work that challenges conventional thinking while providing profound insights into contemporary society.",
      "A beautifully crafted narrative that weaves together multiple storylines to create an unforgettable reading experience.",
      "A thought-provoking exploration of complex themes delivered through masterful storytelling and rich character development."
    ];

    return {
      id: bookId,
      summary: summaries[Math.floor(Math.random() * summaries.length)],
      keyThemes: ['Identity', 'Growth', 'Relationships', 'Society'].slice(0, Math.floor(Math.random() * 3) + 2),
      readingTime: Math.floor(Math.random() * 8) + 2,
      complexity: ['beginner', 'intermediate', 'advanced'][Math.floor(Math.random() * 3)] as any
    };
  }

  private extractThemes(summary: string): string[] {
    // Simple theme extraction (in reality, this would use NLP)
    const commonThemes = ['Love', 'Adventure', 'Mystery', 'Growth', 'Family', 'Friendship', 'Identity', 'Society', 'Nature', 'Technology'];
    return commonThemes.slice(0, Math.floor(Math.random() * 4) + 2);
  }

  private determineComplexity(summary: string): 'beginner' | 'intermediate' | 'advanced' {
    const complexWords = summary.split(' ').filter(word => word.length > 8).length;
    if (complexWords > 10) return 'advanced';
    if (complexWords > 5) return 'intermediate';
    return 'beginner';
  }

  private getSemanticMatches(query: string): string[] {
    const semanticMap: Record<string, string[]> = {
      'love': ['romance', 'relationship', 'heart', 'passion'],
      'adventure': ['journey', 'quest', 'exploration', 'travel'],
      'mystery': ['detective', 'crime', 'puzzle', 'secret'],
      'fantasy': ['magic', 'dragon', 'wizard', 'mythical'],
      'science': ['technology', 'future', 'space', 'research']
    };

    return Object.entries(semanticMap)
      .filter(([key]) => query.includes(key))
      .flatMap(([, values]) => values);
  }

  private calculateRelevance(book: Book, query: string): number {
    let relevance = 0;
    const searchText = `${book.title} ${book.author} ${book.genre}`.toLowerCase();
    
    if (book.title.toLowerCase().includes(query)) relevance += 10;
    if (book.author.toLowerCase().includes(query)) relevance += 8;
    if (book.genre.toLowerCase().includes(query)) relevance += 6;
    if (searchText.includes(query)) relevance += 4;
    
    return relevance;
  }

  private determinePreferredLength(books: Book[]): 'short' | 'medium' | 'long' {
    const avgPages = books.reduce((sum, book) => sum + (book.pages || 300), 0) / books.length;
    if (avgPages < 250) return 'short';
    if (avgPages < 400) return 'medium';
    return 'long';
  }

  private generateMoodTrends(): { mood: string; count: number }[] {
    const moods = ['Happy', 'Contemplative', 'Excited', 'Relaxed', 'Curious'];
    return moods.map(mood => ({
      mood,
      count: Math.floor(Math.random() * 20) + 5
    }));
  }

  private matchesMood(book: Book, mood: string): boolean {
    const moodGenreMap: Record<string, string[]> = {
      'Adventurous': ['Adventure', 'Fantasy', 'Action', 'Thriller'],
      'Contemplative': ['Philosophy', 'Literary Fiction', 'Biography', 'History'],
      'Romantic': ['Romance', 'Contemporary Fiction', 'Historical Romance'],
      'Mysterious': ['Mystery', 'Crime', 'Thriller', 'Detective'],
      'Uplifting': ['Self-Help', 'Inspirational', 'Comedy', 'Young Adult'],
      'Nostalgic': ['Classic', 'Historical Fiction', 'Memoir', 'Literary Fiction']
    };

    const relevantGenres = moodGenreMap[mood] || [];
    return relevantGenres.some(genre => 
      book.genre.toLowerCase().includes(genre.toLowerCase())
    );
  }

  private generateMockRecommendations(userBooks: Book[]): AIRecommendation[] {
    const mockBooks: Book[] = [
      {
        id: 'mock1',
        title: 'The Midnight Library',
        author: 'Matt Haig',
        genre: 'Fiction',
        rating: 4.2,
        pages: 288,
        publicationYear: 2020,
        coverImage: '',
        coverUrl: '',
        description: 'A novel about infinite possibilities',
        isbn: '9780525559474',
        publishYear: 2020,
        status: 'available',
        addedDate: Date.now(),
        popularity: 0,
        isPremium: false
      },
      {
        id: 'mock2',
        title: 'Atomic Habits',
        author: 'James Clear',
        genre: 'Self-Help',
        rating: 4.8,
        pages: 320,
        publicationYear: 2018,
        coverImage: '',
        coverUrl: '',
        description: 'Tiny changes, remarkable results',
        isbn: '9780735211292',
        publishYear: 2018,
        status: 'available',
        addedDate: Date.now(),
        popularity: 0,
        isPremium: false
      },
      {
        id: 'mock3',
        title: 'The Seven Husbands of Evelyn Hugo',
        author: 'Taylor Jenkins Reid',
        genre: 'Historical Fiction',
        rating: 4.6,
        pages: 400,
        publicationYear: 2017,
        coverImage: '',
        coverUrl: '',
        description: 'A reclusive Hollywood icon tells her story',
        isbn: '9781501161933',
        publishYear: 2017,
        status: 'available',
        addedDate: Date.now(),
        popularity: 0,
        isPremium: false
      }
    ];

    return mockBooks.map(book => ({
      id: book.id,
      title: book.title,
      author: book.author,
      coverUrl: book.coverUrl,
      matchScore: 0.8 + Math.random() * 0.2,
      reason: `Recommended based on your reading preferences and high ratings`
    }));
  }
}

export const aiService = new AIService();
