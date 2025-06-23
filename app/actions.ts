"use server"

import * as cheerio from "cheerio"
import type { BusinessResult, SearchResponse } from "./types"
import { BusinessDataValidator } from "./data-validator"
import { DuplicateDetector } from "./duplicate-detector"
import { CacheManager } from "./cache-manager"

/** simple promise-based delay */
function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms))
}

/**
 * Fetch a URL and transparently follow a few 30x redirects.
 * Google sometimes issues 302 responses that must be followed manually.
 */
async function fetchWithRedirects(url: string, options: RequestInit = {}, maxRedirects = 5): Promise<Response> {
  let currentUrl = url
  let redirects = 0

  // Always inspect redirects ourselves
  const baseOpts: RequestInit = { ...options, redirect: "manual" as const }

  while (redirects <= maxRedirects) {
    const res = await fetch(currentUrl, baseOpts)

    // Successful fetch
    if (res.status >= 200 && res.status < 300) return res

    // Handle redirect
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const next = res.headers.get("location")
      if (!next) {
        throw new Error(`Redirect (${res.status}) without Location header`)
      }
      // Google sometimes returns a relative path
      currentUrl = next.startsWith("http") ? next : new URL(next, currentUrl).href
      redirects += 1
      continue
    }

    // Any other status => error
    throw new Error(`Failed to fetch (${res.status})`)
  }

  throw new Error(`Too many redirects when fetching ${url}`)
}

export async function searchBusinesses(query: string, page = 1): Promise<SearchResponse> {
  try {
    // Check cache first
    const location = "" // Extract location from query if needed
    const cached = CacheManager.getCachedSearchResults(query, location, page)
    if (cached) {
      console.log(`Cache hit for search: ${query}, page ${page}`)
      return cached
    }

    const resultsPerPage = 10
    const start = (page - 1) * resultsPerPage
    const formattedQuery = encodeURIComponent(query)

    const url = `https://www.google.com/search?tbm=lcl&q=${formattedQuery}&hl=en&gl=us&start=${start}`

    // Enhanced retry with back-off on 429
    const maxAttempts = 3
    const backoff = [2000, 5000, 10000] // ms

    let response: Response | null = null
    let attempt = 0
    let lastError: unknown = null

    while (attempt < maxAttempts) {
      try {
        response = await fetchWithRedirects(
          url,
          {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0 Safari/537.36",
              Accept: "text/html",
              "Accept-Language": "en-US,en;q=0.9",
            },
            next: { revalidate: 0 },
          },
          5,
        )

        // success!
        break
      } catch (err: any) {
        lastError = err
        console.warn(`Attempt ${attempt + 1} failed:`, err.message)

        // If the error is a 429 or mentions 429, wait then retry
        if (err?.message?.includes("429") && attempt < maxAttempts - 1) {
          console.warn(`Got 429 (rate-limited). Waiting ${backoff[attempt]} ms then retrying…`)
          await delay(backoff[attempt])
          attempt += 1
          continue
        }

        // For other errors, still retry but with shorter delay
        if (attempt < maxAttempts - 1) {
          await delay(1000)
          attempt += 1
          continue
        }

        throw err // different error – bubble up
      }
    }

    if (!response) {
      // exhausted attempts
      throw lastError ?? new Error("Could not fetch Google results after multiple attempts")
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    const results: BusinessResult[] = []

    $(".VkpGBb").each((_, element) => {
      const el = $(element)
      const name = el.find(".dbg0pd .OSrXXb").text().trim()
      const detailsDiv = el.find(".rllt__details")
      const detailDivs = detailsDiv.children("div")
      const category = detailDivs
        .eq(1)
        .text()
        .replace(/^.*·\s*/, "")
        .trim()
      const address = detailDivs.eq(2).text().trim()
      const hoursPhoneDiv = detailDivs.eq(3).text().trim()
      const phoneMatch = hoursPhoneDiv.match(/(\d{3,}[-.\s]?\d{3,}[-.\s]?\d{4})/)
      const phone = phoneMatch ? phoneMatch[0] : ""
      const websiteEl = el.parent().parent().find("a:has(.BSaJxc)")
      let website = ""
      if (websiteEl.length) {
        website = websiteEl.attr("href") ?? ""
        if (website.includes("/url?")) {
          const m = website.match(/url\?q=([^&]+)/)
          if (m?.[1]) website = decodeURIComponent(m[1])
        }
      }
      if (name) {
        const business: BusinessResult = {
          name,
          phone,
          email: "",
          website,
          address,
          category,
        }

        // Validate and clean the business data
        const validatedBusiness = BusinessDataValidator.validateBusinessResult(business)
        results.push(validatedBusiness)
      }
    })

    // Remove duplicates
    const uniqueResults = DuplicateDetector.removeDuplicates(results)

    // Pagination info
    const hasNextPage =
      !!$(".d6cvqb a[id='pnnext']").length ||
      !!$("a[aria-label='Next page']").length ||
      !!$("a:contains('Next')").length

    const totalResultsText = $("#resultStats").text()
    const totalMatch = totalResultsText.match(/[\d,]+/)
    const totalResults = totalMatch ? Number.parseInt(totalMatch[0].replace(/,/g, ""), 10) : 0

    const searchResponse: SearchResponse = {
      businesses: uniqueResults,
      pagination: {
        currentPage: page,
        hasNextPage,
        hasPreviousPage: page > 1,
        totalPages: totalResults ? Math.ceil(totalResults / resultsPerPage) : page + (hasNextPage ? 1 : 0),
        totalResults,
      },
    }

    // Cache the results
    CacheManager.cacheSearchResults(query, location, page, searchResponse)

    return searchResponse
  } catch (error) {
    console.error("Error scraping business information:", error)
    throw new Error("Failed to scrape business information")
  }
}
