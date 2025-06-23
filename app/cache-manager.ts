import type { BusinessResult, SearchResponse } from "./types"

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

export class CacheManager {
  private static cache = new Map<string, CacheEntry<any>>()
  private static readonly DEFAULT_TTL = 3600000 // 1 hour in milliseconds
  private static readonly MAX_CACHE_SIZE = 1000

  /**
   * Generate cache key from query parameters
   */
  private static generateKey(prefix: string, ...params: string[]): string {
    return `${prefix}:${params.join(":").toLowerCase().replace(/\s+/g, "_")}`
  }

  /**
   * Set cache entry
   */
  static set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    // Clean up expired entries if cache is getting large
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.cleanup()
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    })
  }

  /**
   * Get cache entry
   */
  static get<T>(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) return null

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  /**
   * Cache search results
   */
  static cacheSearchResults(query: string, location: string, page: number, results: SearchResponse): void {
    const key = this.generateKey("search", query, location, page.toString())
    this.set(key, results, 1800000) // 30 minutes for search results
  }

  /**
   * Get cached search results
   */
  static getCachedSearchResults(query: string, location: string, page: number): SearchResponse | null {
    const key = this.generateKey("search", query, location, page.toString())
    return this.get<SearchResponse>(key)
  }

  /**
   * Cache business contact data
   */
  static cacheBusinessContacts(url: string, contacts: { emails: string[]; phones: string[] }): void {
    const key = this.generateKey("contacts", url)
    this.set(key, contacts, 86400000) // 24 hours for contact data
  }

  /**
   * Get cached business contacts
   */
  static getCachedBusinessContacts(url: string): { emails: string[]; phones: string[] } | null {
    const key = this.generateKey("contacts", url)
    return this.get<{ emails: string[]; phones: string[] }>(key)
  }

  /**
   * Cache website content
   */
  static cacheWebsiteContent(url: string, content: string): void {
    const key = this.generateKey("content", url)
    this.set(key, content, 3600000) // 1 hour for website content
  }

  /**
   * Get cached website content
   */
  static getCachedWebsiteContent(url: string): string | null {
    const key = this.generateKey("content", url)
    return this.get<string>(key)
  }

  /**
   * Cache custom scrape results
   */
  static cacheCustomScrapeResults(
    websites: string[],
    businessType: string,
    location: string,
    results: BusinessResult[],
  ): void {
    const websitesHash = this.hashArray(websites)
    const key = this.generateKey("custom_scrape", websitesHash, businessType, location)
    this.set(key, results, 1800000) // 30 minutes for custom scrape
  }

  /**
   * Get cached custom scrape results
   */
  static getCachedCustomScrapeResults(
    websites: string[],
    businessType: string,
    location: string,
  ): BusinessResult[] | null {
    const websitesHash = this.hashArray(websites)
    const key = this.generateKey("custom_scrape", websitesHash, businessType, location)
    return this.get<BusinessResult[]>(key)
  }

  /**
   * Clean up expired entries
   */
  static cleanup(): void {
    const now = Date.now()
    const keysToDelete: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach((key) => this.cache.delete(key))

    console.log(`Cache cleanup: removed ${keysToDelete.length} expired entries`)
  }

  /**
   * Clear all cache
   */
  static clear(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  static getStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0, // Would need to track hits/misses for accurate rate
    }
  }

  /**
   * Hash array of strings for cache key
   */
  private static hashArray(arr: string[]): string {
    return arr.sort().join("|").substring(0, 50) // Limit length and sort for consistency
  }

  /**
   * Check if cache entry exists and is valid
   */
  static has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return false
    }

    return true
  }
}
