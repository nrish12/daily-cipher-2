interface CachedMystery {
  data: any;
  timestamp: number;
}

const CACHE_DURATION = 5 * 60 * 1000;

class GameCache {
  private mysteryCache: Map<string, CachedMystery> = new Map();
  private categoryCache: Map<string, any[]> = new Map();

  getMystery(category: string, date: string): any | null {
    const key = `${category}-${date}`;
    const cached = this.mysteryCache.get(key);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('🚀 Cache hit for mystery:', key);
      return cached.data;
    }

    if (cached) {
      this.mysteryCache.delete(key);
    }

    return null;
  }

  setMystery(category: string, date: string, data: any): void {
    const key = `${category}-${date}`;
    this.mysteryCache.set(key, {
      data,
      timestamp: Date.now(),
    });
    console.log('💾 Cached mystery:', key);
  }

  getCategories(): any[] | null {
    const cached = this.categoryCache.get('list');

    if (cached) {
      console.log('🚀 Cache hit for categories');
      return cached;
    }

    return null;
  }

  setCategories(categories: any[]): void {
    this.categoryCache.set('list', categories);
    console.log('💾 Cached categories');
  }

  clear(): void {
    this.mysteryCache.clear();
    this.categoryCache.clear();
    console.log('🗑️ Cache cleared');
  }
}

export const gameCache = new GameCache();
