import type { BusinessResult } from "./types"

export class BusinessDataValidator {
  /**
   * Validate and format phone numbers
   */
  static validatePhone(phone: string): string | null {
    if (!phone || typeof phone !== "string") return null

    // Remove all non-digits
    const digits = phone.replace(/\D/g, "")

    // Skip obviously invalid numbers
    if (digits.length < 7 || digits.length > 15) return null

    // Check for repeated digits (likely fake)
    if (/(\d)\1{6,}/.test(digits)) return null

    // Common fake numbers
    const fakeNumbers = ["1234567890", "0000000000", "1111111111"]
    if (fakeNumbers.includes(digits)) return null

    // US phone number patterns
    if (digits.length === 10) {
      // Check for valid area code (not starting with 0 or 1)
      if (digits[0] === "0" || digits[0] === "1") return null
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
    }

    if (digits.length === 11 && digits[0] === "1") {
      // US number with country code
      if (digits[1] === "0" || digits[1] === "1") return null
      return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
    }

    // International patterns (7-15 digits)
    if (digits.length >= 7 && digits.length <= 15) {
      return `+${digits}`
    }

    return null
  }

  /**
   * Validate email addresses
   */
  static validateEmail(email: string): boolean {
    if (!email || typeof email !== "string") return false

    // Basic email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) return false

    // Check for disposable/temporary email domains
    if (this.isDisposableEmail(email)) return false

    // Check for common fake patterns
    const fakePatternsRegex = /^(test|example|sample|demo|noreply|no-reply)@/i
    if (fakePatternsRegex.test(email)) return false

    // Check email length
    if (email.length > 254) return false

    return true
  }

  /**
   * Check if email is from a disposable email service
   */
  static isDisposableEmail(email: string): boolean {
    const disposableDomains = [
      "tempmail.com",
      "10minutemail.com",
      "guerrillamail.com",
      "mailinator.com",
      "throwaway.email",
      "temp-mail.org",
      "getnada.com",
      "maildrop.cc",
      "yopmail.com",
      "sharklasers.com",
      "guerrillamailblock.com",
    ]

    const domain = email.split("@")[1]?.toLowerCase()
    return disposableDomains.includes(domain)
  }

  /**
   * Validate and normalize website URLs
   */
  static validateWebsite(url: string): string | null {
    if (!url || typeof url !== "string") return null

    try {
      // Clean the URL
      let cleanUrl = url.trim().toLowerCase()

      // Remove common prefixes that users might include
      cleanUrl = cleanUrl.replace(/^(https?:\/\/)?(www\.)?/, "")

      // Remove trailing slashes and paths for validation
      const domainOnly = cleanUrl.split("/")[0]

      // Check for valid domain format
      if (!domainOnly.includes(".") || domainOnly.endsWith(".")) return null

      // Reject localhost and IP addresses
      if (
        domainOnly.includes("localhost") ||
        domainOnly.includes("127.0.0.1") ||
        /^\d+\.\d+\.\d+\.\d+$/.test(domainOnly)
      ) {
        return null
      }

      // Add https:// prefix for full URL
      const fullUrl = `https://${cleanUrl}`

      // Validate URL structure
      const urlObj = new URL(fullUrl)
      return urlObj.href
    } catch {
      return null
    }
  }

  /**
   * Clean and validate business name
   */
  static validateBusinessName(name: string): string | null {
    if (!name || typeof name !== "string") return null

    const cleaned = name.trim()

    // Check minimum length
    if (cleaned.length < 2) return null

    // Check maximum length
    if (cleaned.length > 200) return cleaned.substring(0, 200)

    // Remove excessive whitespace
    return cleaned.replace(/\s+/g, " ")
  }

  /**
   * Clean and validate address
   */
  static validateAddress(address: string): string | null {
    if (!address || typeof address !== "string") return null

    const cleaned = address.trim()

    // Check minimum length
    if (cleaned.length < 5) return null

    // Check maximum length
    if (cleaned.length > 500) return cleaned.substring(0, 500)

    // Remove excessive whitespace and normalize
    return cleaned.replace(/\s+/g, " ")
  }

  /**
   * Validate complete business result
   */
  static validateBusinessResult(business: BusinessResult): BusinessResult {
    return {
      name: this.validateBusinessName(business.name) || business.name,
      phone: this.validatePhone(business.phone) || "",
      email: business.email && this.validateEmail(business.email) ? business.email : "",
      website: this.validateWebsite(business.website) || "",
      address: this.validateAddress(business.address) || "",
      category: business.category?.trim() || "",
    }
  }
}
