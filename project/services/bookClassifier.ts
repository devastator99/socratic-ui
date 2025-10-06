import { Book } from '@/types/book';
import OpenAI from 'openai';

type ClassificationOptions = {
  model?: string;
  temperature?: number;
};

export class BookClassifier {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ 
      apiKey,
      dangerouslyAllowBrowser: true 
    });
  }

  async classifyBook(text: string, options?: ClassificationOptions): Promise<Partial<Book>> {
    const prompt = `Analyze the following book text and provide:
1. Up to 3 relevant genres
2. Up to 5 thematic tags
3. The mood/tone of the book
4. The writing style
5. A quality score (1-5)
6. A brief summary (1-2 sentences)

Book text: "${text}"`;

    try {
      const response = await this.openai.chat.completions.create({
        model: options?.model || 'gpt-4',
        temperature: options?.temperature || 0.7,
        messages: [
          {
            role: 'system',
            content: 'You are an expert literary analyst. Provide structured JSON output for book classification.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(response.choices[0]?.message?.content || '{}');
      
      return {
        genre: result.genres?.[0],
        aiTags: {
          genre: result.genres,
          themes: result.themes,
          mood: result.mood ? [result.mood] : undefined,
          writingStyle: result.writingStyle ? [result.writingStyle] : undefined
        },
        aiScore: result.score,
        aiSummary: result.summary
      };
    } catch (error) {
      console.error('Error classifying book:', error);
      return {};
    }
  }

  async classifyBookFromDescription(book: Book): Promise<Book> {
    if (!book.description) return book;
    
    const classification = await this.classifyBook(book.description);
    return {
      ...book,
      ...classification,
      tags: [...(book.tags || []), ...(classification.aiTags?.themes || [])]
    };
  }

  async classifyExistingBooks(books: Book[], batchSize = 5): Promise<Book[]> {
    const classifiedBooks: Book[] = [];
    
    for (let i = 0; i < books.length; i += batchSize) {
      const batch = books.slice(i, i + batchSize);
      const batchPromises = batch.map(book => {
        if (book.description) {
          return this.classifyBookFromDescription(book);
        }
        return Promise.resolve(book);
      });
      
      const classifiedBatch = await Promise.all(batchPromises);
      classifiedBooks.push(...classifiedBatch);
      
      // Add small delay between batches to avoid rate limiting
      if (i + batchSize < books.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return classifiedBooks;
  }
}

export const bookClassifier = new BookClassifier(process.env.OPENAI_API_KEY || '');
