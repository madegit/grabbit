"use server"

/**
 * Enhanced email extraction with multiple patterns and strategies
 */
export async function extractEmailsEnhanced(url: string): Promise<string[]> {
  try {
    if (!url || !url.startsWith("http")) {
      return []
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: controller.signal,
        next: { revalidate: 0 },
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        return []
      }

      const html = await response.text()
      const limitedHtml = html.substring(0, 50000)

      const cheerio = await import("cheerio")
      const $ = cheerio.load(limitedHtml)
      $("script, style, noscript").remove()

      const emails = new Set<string>()

      // Extract from mailto links
      $('a[href^="mailto:"]').each((_, element) => {
        const href = $(element).attr("href")
        if (href) {
          const email = href.replace("mailto:", "").split("?")[0].trim()
          if (isValidEmail(email)) {
            emails.add(email.toLowerCase())
          }
        }
      })

      // Extract from text content
      const bodyText = $("body").text()
      const emailMatches = bodyText.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g) || []

      emailMatches.forEach((email) => {
        if (isValidEmail(email)) {
          emails.add(email.toLowerCase())
        }
      })

      // Filter out common false positives
      const validEmails = Array.from(emails).filter((email) => {
        return (
          !email.includes("example.com") &&
          !email.includes("yourdomain") &&
          !email.includes("domain.com") &&
          !email.includes("test@") &&
          !email.includes("sample@")
        )
      })

      return validEmails.slice(0, 5)
    } catch (error) {
      clearTimeout(timeoutId)
      return []
    }
  } catch (error) {
    return []
  }
}

/**
 * Enhanced phone extraction with multiple patterns
 */
export async function extractPhonesEnhanced(url: string): Promise<string[]> {
  try {
    if (!url || !url.startsWith("http")) {
      return []
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        signal: controller.signal,
        next: { revalidate: 0 },
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        return []
      }

      const html = await response.text()
      const limitedHtml = html.substring(0, 50000)

      const cheerio = await import("cheerio")
      const $ = cheerio.load(limitedHtml)
      $("script, style, noscript").remove()

      const phones = new Set<string>()

      // Extract from tel: links
      $('a[href^="tel:"]').each((_, element) => {
        const href = $(element).attr("href")
        if (href) {
          const phone = href.replace("tel:", "").trim()
          if (isValidPhone(phone)) {
            phones.add(phone)
          }
        }
      })

      // Extract phone numbers from text
      const bodyText = $("body").text()

      // Simple phone patterns that work
      const patterns = [
        // (123) 456-7890
        /$$\d{3}$$\s*\d{3}[-.\s]*\d{4}/g,
        // 123-456-7890
        /\d{3}[-.\s]\d{3}[-.\s]\d{4}/g,
        // 123.456.7890
        /\d{3}\.\d{3}\.\d{4}/g,
        // +1 123 456 7890
        /\+1\s*\d{3}\s*\d{3}\s*\d{4}/g,
        // 1-800-123-4567
        /1[-.\s]*800[-.\s]*\d{3}[-.\s]*\d{4}/g,
      ]

      patterns.forEach((pattern) => {
        const matches = bodyText.match(pattern) || []
        matches.forEach((match) => {
          const cleaned = match.trim()
          if (isValidPhone(cleaned)) {
            phones.add(cleaned)
          }
        })
      })

      // Filter and validate phones
      const validPhones = Array.from(phones).filter((phone) => {
        const digitsOnly = phone.replace(/\D/g, "")
        return (
          digitsOnly.length >= 10 &&
          digitsOnly.length <= 15 &&
          !phone.includes("1234567890") &&
          !phone.includes("0000000000")
        )
      })

      return validPhones.slice(0, 3)
    } catch (error) {
      clearTimeout(timeoutId)
      return []
    }
  } catch (error) {
    return []
  }
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 254
}

function isValidPhone(phone: string): boolean {
  const digitsOnly = phone.replace(/\D/g, "")
  return digitsOnly.length >= 7 && digitsOnly.length <= 15
}
