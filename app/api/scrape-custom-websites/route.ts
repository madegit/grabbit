import type { NextRequest } from "next/server"
import { extractBusinessInfoFromWebsite } from "@/app/custom-website-scraper"
import { DuplicateDetector } from "@/app/duplicate-detector"
import { CacheManager } from "@/app/cache-manager"
import type { BusinessResult } from "@/app/types"

interface DetailedError {
  url: string
  error: string
  category: "validation" | "network" | "content" | "timeout" | "unknown"
}

export async function POST(request: NextRequest) {
  try {
    // Add timeout for the entire request
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Request timeout after 5 minutes")), 300000)
    })

    const processRequest = async () => {
      const body = await request.json()
      const { websites, businessType, location } = body as {
        websites: string[]
        businessType?: string
        location?: string
      }

      if (!websites || !Array.isArray(websites)) {
        return new Response(
          JSON.stringify({
            error: "Invalid request body - websites must be an array",
            businesses: [],
            errors: [],
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        )
      }

      if (websites.length === 0) {
        return new Response(
          JSON.stringify({
            error: "No websites provided",
            businesses: [],
            errors: [],
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        )
      }

      // Check cache first
      const cached = CacheManager.getCachedCustomScrapeResults(websites, businessType || "", location || "")
      if (cached) {
        console.log(`Cache hit for custom scrape: ${websites.length} websites`)
        return new Response(
          JSON.stringify({
            businesses: cached,
            errors: [],
            stats: {
              total: websites.length,
              successful: cached.length,
              failed: 0,
              errorsByCategory: {},
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        )
      }

      // Enhanced URL validation and cleaning
      const processedWebsites: { original: string; cleaned: string }[] = []
      const validationErrors: DetailedError[] = []

      for (const originalUrl of websites) {
        const trimmed = originalUrl.trim()
        if (!trimmed) continue

        try {
          // Basic URL cleaning
          let cleanUrl = trimmed.toLowerCase()

          // Remove common prefixes users might include
          cleanUrl = cleanUrl.replace(/^(https?:\/\/)?(www\.)?/, "")

          // Add https:// prefix
          cleanUrl = `https://${cleanUrl}`

          // Validate URL
          const urlObj = new URL(cleanUrl)

          // Additional validation
          if (!urlObj.hostname.includes(".")) {
            throw new Error("Invalid domain format")
          }

          if (
            urlObj.hostname.includes("localhost") ||
            urlObj.hostname.includes("127.0.0.1") ||
            /^\d+\.\d+\.\d+\.\d+$/.test(urlObj.hostname)
          ) {
            throw new Error("Local URLs not supported")
          }

          processedWebsites.push({ original: originalUrl, cleaned: cleanUrl })
        } catch (error: any) {
          validationErrors.push({
            url: originalUrl,
            error: `Invalid URL: ${error.message}`,
            category: "validation",
          })
        }
      }

      if (processedWebsites.length === 0) {
        return new Response(
          JSON.stringify({
            error: "No valid websites provided",
            businesses: [],
            errors: validationErrors.map((e) => `${e.url}: ${e.error}`),
            stats: {
              total: websites.length,
              successful: 0,
              failed: validationErrors.length,
              errorsByCategory: { validation: validationErrors.length },
            },
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        )
      }

      // Limit the number of websites to prevent abuse
      const maxWebsites = 50
      const limitedWebsites = processedWebsites.slice(0, maxWebsites)

      if (processedWebsites.length > maxWebsites) {
        console.log(`Limited processing to ${maxWebsites} websites (${processedWebsites.length} provided)`)
      }

      console.log(`Processing ${limitedWebsites.length} websites`)
      if (businessType) console.log(`Business type filter: ${businessType}`)
      if (location) console.log(`Location filter: ${location}`)

      const businesses: BusinessResult[] = []
      const detailedErrors: DetailedError[] = [...validationErrors]

      // Process websites with enhanced concurrency control
      const concurrencyLimit = 3
      const batchDelay = 2000 // 2 seconds between batches

      for (let i = 0; i < limitedWebsites.length; i += concurrencyLimit) {
        const batch = limitedWebsites.slice(i, i + concurrencyLimit)
        const batchNumber = Math.floor(i / concurrencyLimit) + 1
        const totalBatches = Math.ceil(limitedWebsites.length / concurrencyLimit)

        console.log(`Processing batch ${batchNumber}/${totalBatches}: ${batch.map((w) => w.cleaned).join(", ")}`)

        const batchPromises = batch.map(async ({ original, cleaned }) => {
          try {
            console.log(`🔄 Starting extraction for: ${cleaned}`)

            const businessInfo = await extractBusinessInfoFromWebsite(cleaned, businessType, location, (progress) => {
              console.log(`📊 ${cleaned}: ${progress.status} (${Math.round(progress.completed * 100)}%)`)
            })

            if (businessInfo) {
              businesses.push(businessInfo)
              console.log(`✅ Successfully scraped: ${businessInfo.name} from ${cleaned}`)
            } else {
              detailedErrors.push({
                url: original,
                error: "No business information could be extracted",
                category: "content",
              })
              console.log(`⚠️ No business info extracted from ${cleaned}`)
            }
          } catch (error: any) {
            let errorCategory: DetailedError["category"] = "unknown"
            let errorMessage = error.message || "Unknown error"

            // Categorize errors for better user feedback
            if (errorMessage.includes("timeout") || errorMessage.includes("Request timeout")) {
              errorCategory = "timeout"
              errorMessage = "Website took too long to respond (timeout after 30 seconds)"
            } else if (
              errorMessage.includes("Access denied") ||
              errorMessage.includes("403") ||
              errorMessage.includes("429")
            ) {
              errorCategory = "network"
              errorMessage = "Website is blocking automated requests"
            } else if (errorMessage.includes("404") || errorMessage.includes("not found")) {
              errorCategory = "network"
              errorMessage = "Website not found (404 error)"
            } else if (errorMessage.includes("Not a business website")) {
              errorCategory = "content"
              errorMessage = "Does not appear to be a business website"
            } else if (errorMessage.includes("Invalid URL")) {
              errorCategory = "validation"
            } else if (errorMessage.includes("Server error") || errorMessage.includes("5")) {
              errorCategory = "network"
              errorMessage = "Website server error - may be temporarily unavailable"
            } else if (errorMessage.includes("quota") || errorMessage.includes("exceeded")) {
              errorCategory = "network"
              errorMessage = "AI service temporarily unavailable - using traditional extraction"
            }

            detailedErrors.push({
              url: original,
              error: errorMessage,
              category: errorCategory,
            })

            console.error(`❌ Failed to scrape ${cleaned}: ${errorMessage}`)
          }
        })

        // Wait for current batch to complete
        await Promise.all(batchPromises)

        // Add delay between batches to be respectful to servers
        if (i + concurrencyLimit < limitedWebsites.length) {
          console.log(`⏳ Waiting ${batchDelay / 1000}s before next batch...`)
          await new Promise((resolve) => setTimeout(resolve, batchDelay))
        }
      }

      // Remove duplicates from results
      const uniqueBusinesses = DuplicateDetector.removeDuplicates(businesses)

      // Cache the results
      CacheManager.cacheCustomScrapeResults(websites, businessType || "", location || "", uniqueBusinesses)

      // Generate summary statistics
      const stats = {
        total: limitedWebsites.length,
        successful: uniqueBusinesses.length,
        failed: detailedErrors.length,
        errorsByCategory: detailedErrors.reduce(
          (acc, error) => {
            acc[error.category] = (acc[error.category] || 0) + 1
            return acc
          },
          {} as Record<string, number>,
        ),
      }

      console.log(`📊 Scraping complete:`, stats)

      // Prepare response with consistent format
      const response = {
        businesses: uniqueBusinesses,
        errors: detailedErrors.map((e) => `${e.url}: ${e.error}`),
        stats,
        detailedErrors,
      }

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Race between the actual processing and timeout
    return await Promise.race([processRequest(), timeoutPromise])
  } catch (error) {
    console.error("Error in scrape-custom-websites API route:", error)

    // Return a consistent error response format
    const errorResponse = {
      error: error instanceof Error ? error.message : "Failed to process request",
      businesses: [],
      errors: [error instanceof Error ? error.message : "Unknown server error"],
      stats: {
        total: 0,
        successful: 0,
        failed: 1,
        errorsByCategory: { unknown: 1 },
      },
    }

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
