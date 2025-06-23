"use server"

import { hybridContactExtraction } from "./ai-enhanced-extractor"
import { BusinessDataValidator } from "./data-validator"
import { CacheManager } from "./cache-manager"
import { extractEmailsEnhanced } from "./enhanced-extractors"

export async function extractEmailFromWebsite(url: string): Promise<string | null> {
  try {
    if (!url || !url.startsWith("http")) {
      return null
    }

    // Check cache first
    const cached = CacheManager.getCachedBusinessContacts(url)
    if (cached && cached.emails.length > 0) {
      return cached.emails[0]
    }

    console.log(`🔍 Extracting email from: ${url}`)

    // Check if OpenAI is available
    const hasOpenAI = !!process.env.OPENAI_API_KEY

    if (hasOpenAI) {
      try {
        // Use hybrid AI + traditional extraction
        const result = await hybridContactExtraction(url)

        // Validate emails
        const validEmails = result.emails.filter((email) => BusinessDataValidator.validateEmail(email))

        if (validEmails.length > 0) {
          // Cache the results
          CacheManager.cacheBusinessContacts(url, {
            emails: validEmails,
            phones: result.phones,
          })

          console.log(
            `✅ Found email via ${result.method}: ${validEmails[0]} (confidence: ${result.confidence.emails})`,
          )
          return validEmails[0]
        }
      } catch (aiError: any) {
        console.warn(`AI extraction failed, falling back to traditional: ${aiError.message}`)
      }
    }

    // Fallback to traditional extraction
    console.log(`🔧 Using traditional extraction for: ${url}`)
    const emails = await extractEmailsEnhanced(url)
    const validEmails = emails.filter((email) => BusinessDataValidator.validateEmail(email))

    if (validEmails.length > 0) {
      // Cache the results
      CacheManager.cacheBusinessContacts(url, {
        emails: validEmails,
        phones: [],
      })

      console.log(`✅ Found email via traditional method: ${validEmails[0]}`)
      return validEmails[0]
    }

    // Try contact page if no emails found on main page
    try {
      const contactPageEmail = await tryContactPage(url)
      if (contactPageEmail) {
        CacheManager.cacheBusinessContacts(url, {
          emails: [contactPageEmail],
          phones: [],
        })
        return contactPageEmail
      }
    } catch (error) {
      console.warn(`Contact page extraction failed for ${url}:`, error)
    }

    console.log(`❌ No valid emails found for: ${url}`)
    return null
  } catch (error) {
    console.error("Error extracting email:", error)
    return null
  }
}

async function tryContactPage(url: string): Promise<string | null> {
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

    // Use enhanced extraction on contact page
    const contactEmails = await extractEmailsEnhanced(contactUrl)
    const validEmails = contactEmails.filter((email) => BusinessDataValidator.validateEmail(email))

    return validEmails.length > 0 ? validEmails[0] : null
  } catch (error) {
    return null
  }
}
