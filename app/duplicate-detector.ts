import type { BusinessResult } from "./types"

export class DuplicateDetector {
  /**
   * Remove duplicates from business results array
   */
  static removeDuplicates(businesses: BusinessResult[]): BusinessResult[] {
    const unique: BusinessResult[] = []
    const seen = new Set<string>()

    for (const business of businesses) {
      const signature = this.createBusinessSignature(business)

      if (!seen.has(signature)) {
        // Check for similar businesses using fuzzy matching
        const isDuplicate = unique.some((existing) => this.calculateSimilarity(business, existing) > 0.85)

        if (!isDuplicate) {
          unique.push(business)
          seen.add(signature)
        }
      }
    }

    return unique
  }

  /**
   * Calculate similarity between two businesses
   */
  static calculateSimilarity(business1: BusinessResult, business2: BusinessResult): number {
    // Name similarity (most important)
    const nameScore = this.stringSimilarity(
      this.normalizeBusinessName(business1.name),
      this.normalizeBusinessName(business2.name),
    )

    // Phone similarity (exact match)
    const phoneScore = this.phoneSimilarity(business1.phone, business2.phone)

    // Website similarity (domain comparison)
    const websiteScore = this.websiteSimilarity(business1.website, business2.website)

    // Address similarity
    const addressScore = this.stringSimilarity(
      this.normalizeAddress(business1.address),
      this.normalizeAddress(business2.address),
    )

    // Email similarity (domain comparison)
    const emailScore = this.emailSimilarity(business1.email, business2.email)

    // Weighted average
    const weights = {
      name: 0.4,
      phone: 0.2,
      website: 0.15,
      address: 0.15,
      email: 0.1,
    }

    return (
      nameScore * weights.name +
      phoneScore * weights.phone +
      websiteScore * weights.website +
      addressScore * weights.address +
      emailScore * weights.email
    )
  }

  /**
   * Create a unique signature for a business
   */
  private static createBusinessSignature(business: BusinessResult): string {
    const normalizedName = this.normalizeBusinessName(business.name)
    const normalizedPhone = business.phone?.replace(/\D/g, "") || ""
    const normalizedWebsite = this.extractDomain(business.website) || ""

    return `${normalizedName}|${normalizedPhone}|${normalizedWebsite}`.toLowerCase()
  }

  /**
   * Normalize business name for comparison
   */
  private static normalizeBusinessName(name: string): string {
    if (!name) return ""

    return name
      .toLowerCase()
      .replace(/[^\w\s]/g, "") // Remove punctuation
      .replace(/\b(inc|llc|ltd|corp|corporation|company|co|llp|lp)\b/g, "") // Remove business suffixes
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim()
  }

  /**
   * Normalize address for comparison
   */
  private static normalizeAddress(address: string): string {
    if (!address) return ""

    return address
      .toLowerCase()
      .replace(/\b(street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|place|pl)\b/g, "") // Remove street types
      .replace(/[^\w\s]/g, "") // Remove punctuation
      .replace(/\s+/g, " ")
      .trim()
  }

  /**
   * Calculate string similarity using Jaro-Winkler distance
   */
  static stringSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0
    if (str1 === str2) return 1

    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1

    if (longer.length === 0) return 1

    const editDistance = this.levenshteinDistance(longer, shorter)
    return (longer.length - editDistance) / longer.length
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = []

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1, // deletion
          )
        }
      }
    }

    return matrix[str2.length][str1.length]
  }

  /**
   * Compare phone numbers
   */
  private static phoneSimilarity(phone1: string, phone2: string): number {
    if (!phone1 || !phone2) return 0

    const digits1 = phone1.replace(/\D/g, "")
    const digits2 = phone2.replace(/\D/g, "")

    if (digits1 === digits2) return 1

    // Check if one is a subset of the other (e.g., with/without country code)
    if (digits1.includes(digits2) || digits2.includes(digits1)) return 0.8

    return 0
  }

  /**
   * Compare websites by domain
   */
  private static websiteSimilarity(website1: string, website2: string): number {
    if (!website1 || !website2) return 0

    const domain1 = this.extractDomain(website1)
    const domain2 = this.extractDomain(website2)

    if (!domain1 || !domain2) return 0
    if (domain1 === domain2) return 1

    // Check for similar domains (e.g., with/without www)
    const normalized1 = domain1.replace(/^www\./, "")
    const normalized2 = domain2.replace(/^www\./, "")

    return normalized1 === normalized2 ? 1 : 0
  }

  /**
   * Compare emails by domain
   */
  private static emailSimilarity(email1: string, email2: string): number {
    if (!email1 || !email2) return 0
    if (email1 === email2) return 1

    const domain1 = email1.split("@")[1]
    const domain2 = email2.split("@")[1]

    if (domain1 && domain2 && domain1 === domain2) return 0.7

    return 0
  }

  /**
   * Extract domain from URL
   */
  private static extractDomain(url: string): string | null {
    if (!url) return null

    try {
      const urlObj = new URL(url.startsWith("http") ? url : `https://${url}`)
      return urlObj.hostname.toLowerCase()
    } catch {
      return null
    }
  }
}
