"use server"

import * as cheerio from "cheerio"
import { hybridContactExtraction } from "@/app/ai-enhanced-extractor"
import { BusinessDataValidator } from "@/app/data-validator"
import { CacheManager } from "@/app/cache-manager"
import type { BusinessResult } from "@/app/types"

interface ExtractionProgress {
  total: number
  completed: number
  current: string
  status: string
}

/**
 * Enhanced URL validation and normalization
 */
function validateAndNormalizeUrl(url: string): string | null {
  const normalized = BusinessDataValidator.validateWebsite(url)
  return normalized
}

/**
 * Enhanced fetch with better retry logic and error handling
 */
async function fetchWithEnhancedRetry(url: string, maxRetries = 3, timeoutMs = 30000): Promise<Response> {
  const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0",
  ]

  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

      const response = await fetch(url, {
        headers: {
          "User-Agent": userAgents[attempt % userAgents.length],
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "gzip, deflate, br",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
        signal: controller.signal,
        redirect: "follow",
        next: { revalidate: 0 },
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        return response
      }

      // Handle specific HTTP errors
      if (response.status === 403 || response.status === 429) {
        throw new Error(`Access denied (${response.status}): Website may be blocking automated requests`)
      }

      if (response.status === 404) {
        throw new Error(`Page not found (404): Website may not exist`)
      }

      if (response.status >= 500) {
        throw new Error(`Server error (${response.status}): Website may be temporarily unavailable`)
      }

      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    } catch (error: any) {
      lastError = error

      // Don't retry on certain errors
      if (error.name === "AbortError") {
        throw new Error(`Request timeout after ${timeoutMs / 1000} seconds`)
      }

      if (error.message.includes("404") || error.message.includes("Access denied")) {
        throw error
      }

      // Wait before retry with exponential backoff
      if (attempt < maxRetries - 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError || new Error("Failed to fetch after retries")
}

/**
 * AI-Enhanced business website detection
 */
async function isBusinessWebsiteWithAI(
  url: string,
  htmlContent: string,
): Promise<{ isValid: boolean; confidence: number; reasons: string[] }> {
  try {
    // First try AI analysis
    const aiResult = await hybridContactExtraction(url)

    if (aiResult) {
      const hasBusinessInfo = aiResult.emails.length > 0 || aiResult.phones.length > 0
      const hasContacts = aiResult.emails.length > 0 || aiResult.phones.length > 0
      const avgConfidence = (aiResult.confidence.emails + aiResult.confidence.phones) / 2

      if (hasBusinessInfo || hasContacts) {
        return {
          isValid: true,
          confidence: avgConfidence,
          reasons: [
            hasContacts ? "AI found contact information" : "",
            `AI confidence: ${Math.round(avgConfidence * 100)}%`,
          ].filter(Boolean),
        }
      }
    }
  } catch (error) {
    console.warn(`AI business detection failed for ${url}, falling back to traditional:`, error)
  }

  // Fallback to traditional detection
  const $ = cheerio.load(htmlContent)
  const hostname = new URL(url).hostname.toLowerCase()
  const reasons: string[] = []
  let confidence = 0

  // Check against known non-business platforms
  const nonBusinessSites = [
    "craigslist.org",
    "facebook.com",
    "twitter.com",
    "instagram.com",
    "linkedin.com",
    "youtube.com",
    "google.com",
    "amazon.com",
    "ebay.com",
    "wikipedia.org",
    "reddit.com",
    "pinterest.com",
    "tiktok.com",
    "snapchat.com",
    "github.com",
  ]

  if (nonBusinessSites.some((site) => hostname.includes(site))) {
    reasons.push("Known non-business platform")
    return { isValid: false, confidence: 0, reasons }
  }

  // Traditional business indicators
  const businessIndicators = [
    { terms: ["contact us", "contact"], weight: 15 },
    { terms: ["about us", "about"], weight: 10 },
    { terms: ["services", "our services"], weight: 12 },
    { terms: ["products", "our products"], weight: 10 },
    { terms: ["phone", "call us", "telephone"], weight: 10 },
    { terms: ["email", "contact@", "info@"], weight: 10 },
  ]

  const bodyText = $("body").text().toLowerCase()
  const title = $("title").text().toLowerCase()

  for (const indicator of businessIndicators) {
    const found = indicator.terms.some((term) => bodyText.includes(term) || title.includes(term))
    if (found) {
      confidence += indicator.weight
      reasons.push(`Found business indicator: ${indicator.terms[0]}`)
    }
  }

  const isValid = confidence >= 25
  return { isValid, confidence: confidence / 100, reasons }
}

/**
 * Main extraction function with AI enhancement
 */
export async function extractBusinessInfoFromWebsite(
  url: string,
  businessType?: string,
  location?: string,
  onProgress?: (progress: ExtractionProgress) => void,
): Promise<BusinessResult | null> {
  const normalizedUrl = validateAndNormalizeUrl(url)
  if (!normalizedUrl) {
    throw new Error(`Invalid URL format: ${url}`)
  }

  // Check cache first
  const cacheKey = `ai_business_info:${normalizedUrl}:${businessType || ""}:${location || ""}`
  const cached = CacheManager.get<BusinessResult>(cacheKey)
  if (cached) {
    console.log(`Cache hit for AI business info: ${normalizedUrl}`)
    return cached
  }

  onProgress?.({
    total: 1,
    completed: 0,
    current: normalizedUrl,
    status: "Fetching website...",
  })

  try {
    const response = await fetchWithEnhancedRetry(normalizedUrl, 3, 30000)

    onProgress?.({
      total: 1,
      completed: 0.2,
      current: normalizedUrl,
      status: "Analyzing content with AI...",
    })

    const html = await response.text()

    // Check if this is a business website using AI
    const businessCheck = await isBusinessWebsiteWithAI(normalizedUrl, html)
    if (!businessCheck.isValid) {
      throw new Error(
        `Not a business website (confidence: ${Math.round(businessCheck.confidence * 100)}%). Reasons: ${businessCheck.reasons.join(", ")}`,
      )
    }

    onProgress?.({
      total: 1,
      completed: 0.4,
      current: normalizedUrl,
      status: "Extracting business information with AI...",
    })

    // Use AI to extract all information
    const aiResult = await hybridContactExtraction(normalizedUrl)

    if (!aiResult) {
      throw new Error("AI extraction failed, no business information could be extracted")
    }

    onProgress?.({
      total: 1,
      completed: 0.8,
      current: normalizedUrl,
      status: "Validating extracted data...",
    })

    // Use AI results with fallbacks to provided parameters
    const businessResult: BusinessResult = {
      name: aiResult.businessName || "Unknown Business",
      phone: aiResult.phones[0] || "",
      email: aiResult.emails[0] || "",
      website: normalizedUrl,
      address: location || aiResult.address || "",
      category: businessType || aiResult.businessType || "",
    }

    onProgress?.({
      total: 1,
      completed: 1,
      current: normalizedUrl,
      status: "Complete",
    })

    // Validate the extracted data
    const validatedResult = BusinessDataValidator.validateBusinessResult(businessResult)

    // Cache the result for 24 hours
    CacheManager.set(cacheKey, validatedResult, 86400000)

    console.log(`✅ AI-enhanced extraction completed for ${normalizedUrl}:`, {
      name: validatedResult.name,
      hasEmail: !!validatedResult.email,
      hasPhone: !!validatedResult.phone,
      confidence: aiResult.confidence,
    })

    return validatedResult
  } catch (error: any) {
    console.error(`❌ AI-enhanced extraction failed for ${normalizedUrl}:`, error)
    throw new Error(`${normalizedUrl}: ${error.message}`)
  }
}
