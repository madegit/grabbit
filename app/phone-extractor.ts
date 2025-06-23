"use server"

import { hybridContactExtraction } from "./ai-enhanced-extractor"
import { BusinessDataValidator } from "./data-validator"
import { CacheManager } from "./cache-manager"

export async function extractPhoneFromWebsite(url: string): Promise<string | null> {
  try {
    if (!url || !url.startsWith("http")) {
      return null
    }

    // Check cache first
    const cached = CacheManager.getCachedBusinessContacts(url)
    if (cached && cached.phones.length > 0) {
      return cached.phones[0]
    }

    console.log(`📞 Extracting phone from: ${url}`)

    // Use hybrid AI + traditional extraction
    const result = await hybridContactExtraction(url)

    // Validate and format phones
    const validPhones = result.phones
      .map((phone) => BusinessDataValidator.validatePhone(phone))
      .filter((phone) => phone !== null) as string[]

    if (validPhones.length > 0) {
      // Cache the results
      CacheManager.cacheBusinessContacts(url, {
        emails: result.emails,
        phones: validPhones,
      })

      console.log(`✅ Found phone via ${result.method}: ${validPhones[0]} (confidence: ${result.confidence.phones})`)
      return validPhones[0]
    }

    // Try contact page if no phones found on main page
    try {
      const contactPagePhone = await tryContactPageForPhone(url)
      if (contactPagePhone) {
        CacheManager.cacheBusinessContacts(url, {
          emails: [],
          phones: [contactPagePhone],
        })
        return contactPagePhone
      }
    } catch (error) {
      console.warn(`Contact page phone extraction failed for ${url}:`, error)
    }

    console.log(`❌ No valid phones found for: ${url}`)
    return null
  } catch (error) {
    console.error("Error extracting phone:", error)
    return null
  }
}

async function tryContactPageForPhone(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0 Safari/537.36",
      },
      next: { revalidate: 0 },
    })

    if (!response.ok) return null

    const html = await response.text()
    const cheerio = await import("cheerio")
    const $ = cheerio.load(html)

    // Look for contact page links
    const contactLinks = $('a[href*="contact"], a[href*="Contact"]')
    if (contactLinks.length === 0) return null

    const contactHref = contactLinks.first().attr("href")
    if (!contactHref) return null

    let contactUrl = contactHref
    if (!contactUrl.startsWith("http")) {
      try {
        const urlObj = new URL(url)
        if (contactUrl.startsWith("/")) {
          contactUrl = `${urlObj.origin}${contactUrl}`
        } else {
          contactUrl = `${urlObj.origin}/${contactUrl}`
        }
      } catch (error) {
        return null
      }
    }

    // Use AI extraction on contact page
    const contactResult = await hybridContactExtraction(contactUrl)
    const validPhones = contactResult.phones
      .map((phone) => BusinessDataValidator.validatePhone(phone))
      .filter((phone) => phone !== null) as string[]

    return validPhones.length > 0 ? validPhones[0] : null
  } catch (error) {
    return null
  }
}
