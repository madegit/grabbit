"use server"

import { openai } from "@ai-sdk/openai"
import { generateObject } from "ai"
import { z } from "zod"
import * as cheerio from "cheerio"
import { extractEmailsEnhanced, extractPhonesEnhanced } from "./enhanced-extractors"
import { CacheManager } from "./cache-manager"

// Zod schemas for structured AI output
const ContactExtractionSchema = z.object({
  emails: z.array(z.string()).describe("Valid business email addresses found on the page"),
  phones: z.array(z.string()).describe("Valid business phone numbers found on the page"),
  confidence: z.object({
    emails: z.number().min(0).max(1).describe("Confidence score for email extraction (0-1)"),
    phones: z.number().min(0).max(1).describe("Confidence score for phone extraction (0-1)"),
  }),
  reasoning: z.string().describe("Brief explanation of what was found and why"),
})

const BusinessAnalysisSchema = z.object({
  isBusiness: z.boolean().describe("Whether this appears to be a legitimate business website"),
  businessName: z.string().optional().describe("The business name if found"),
  businessType: z.string().optional().describe("Type of business (e.g., restaurant, law firm, etc.)"),
  confidence: z.number().min(0).max(1).describe("Confidence that this is a business website"),
  reasoning: z.string().describe("Explanation of the analysis"),
})

type ContactExtractionResult = {
  emails: string[]
  phones: string[]
  confidence: { emails: number; phones: number }
  method: "ai" | "traditional" | "hybrid"
}

/**
 * Extract contacts using AI-enhanced analysis
 */
export async function aiContactExtraction(url: string, content: string): Promise<ContactExtractionResult> {
  try {
    // Limit content size for AI processing
    const limitedContent = content.substring(0, 8000)

    console.log(`🤖 Using AI to extract contacts from: ${url}`)

    const result = await generateObject({
      model: openai("gpt-4o-mini"),
      prompt: `
        Analyze this website content and extract legitimate business contact information.
        
        Website URL: ${url}
        Content: ${limitedContent}
        
        Instructions:
        - Only extract real, legitimate business contact information
        - Ignore placeholder emails like "example@domain.com" or "your@email.com"
        - Ignore test phone numbers like "123-456-7890" or repeated digits
        - Focus on professional business emails and phone numbers
        - Provide confidence scores based on how certain you are about the validity
        - Explain your reasoning briefly
      `,
      schema: ContactExtractionSchema,
      maxRetries: 3,
    })

    console.log(`✅ AI extraction successful for ${url}`)
    return {
      emails: result.object.emails,
      phones: result.object.phones,
      confidence: result.object.confidence,
      method: "ai",
    }
  } catch (error: any) {
    console.error(`❌ AI extraction failed for ${url}:`, error.message)
    throw new Error(`AI extraction failed: ${error.message}`)
  }
}

/**
 * Analyze if a website is a business using AI
 */
export async function aiBusinessAnalysis(
  url: string,
  content: string,
): Promise<{
  isBusiness: boolean
  businessName?: string
  businessType?: string
  confidence: number
  reasoning: string
}> {
  try {
    // Limit content for analysis
    const limitedContent = content.substring(0, 6000)

    console.log(`🤖 Analyzing business nature of: ${url}`)

    const result = await generateObject({
      model: openai("gpt-4o-mini"),
      prompt: `
        Analyze this website to determine if it represents a legitimate business.
        
        Website URL: ${url}
        Content: ${limitedContent}
        
        Look for:
        - Business name and branding
        - Products or services offered
        - Contact information
        - Professional content and structure
        - About us or company information
        
        Avoid classifying as business:
        - Personal blogs or portfolios
        - News or media sites
        - Social media platforms
        - Government or educational sites
        - Pure informational sites
      `,
      schema: BusinessAnalysisSchema,
      maxRetries: 3,
    })

    return result.object
  } catch (error: any) {
    console.error(`❌ AI business analysis failed for ${url}:`, error.message)
    throw new Error(`AI business analysis failed: ${error.message}`)
  }
}

/**
 * Hybrid extraction combining AI and traditional methods
 */
export async function hybridContactExtraction(url: string): Promise<ContactExtractionResult> {
  try {
    // Check cache first
    const cached = CacheManager.getCachedBusinessContacts(url)
    if (cached && (cached.emails.length > 0 || cached.phones.length > 0)) {
      return {
        emails: cached.emails,
        phones: cached.phones,
        confidence: { emails: 0.8, phones: 0.8 },
        method: "hybrid",
      }
    }

    // Fetch website content
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0 Safari/537.36",
      },
      next: { revalidate: 0 },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status}`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // Remove script and style elements
    $("script, style, nav, footer").remove()

    // Extract clean text content
    const textContent = $("body").text().replace(/\s+/g, " ").trim()

    // Try AI extraction first
    try {
      const aiResult = await aiContactExtraction(url, textContent)

      // Cache successful AI results
      CacheManager.cacheBusinessContacts(url, {
        emails: aiResult.emails,
        phones: aiResult.phones,
      })

      return aiResult
    } catch (aiError: any) {
      console.warn(`AI extraction failed, falling back to traditional methods: ${aiError.message}`)

      // Fallback to traditional extraction
      const emails = await extractEmailsEnhanced(url)
      const phones = await extractPhonesEnhanced(url)

      const result: ContactExtractionResult = {
        emails,
        phones,
        confidence: { emails: 0.6, phones: 0.6 },
        method: "traditional",
      }

      // Cache traditional results
      if (emails.length > 0 || phones.length > 0) {
        CacheManager.cacheBusinessContacts(url, { emails, phones })
      }

      return result
    }
  } catch (error: any) {
    console.error(`❌ Hybrid extraction failed for ${url}:`, error.message)
    throw new Error(`Hybrid extraction failed: ${error.message}`)
  }
}

/**
 * AI-enhanced business information extraction
 */
export async function aiBusinessExtraction(
  url: string,
  businessType?: string,
  location?: string,
): Promise<{
  name: string
  phone: string
  email: string
  website: string
  address: string
  category: string
} | null> {
  try {
    // Fetch and analyze content
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0 Safari/537.36",
      },
      next: { revalidate: 0 },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status}`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)
    $("script, style").remove()
    const textContent = $("body").text().replace(/\s+/g, " ").trim()

    // First, check if it's a business
    const businessAnalysis = await aiBusinessAnalysis(url, textContent)

    if (!businessAnalysis.isBusiness || businessAnalysis.confidence < 0.6) {
      throw new Error("Not a business website")
    }

    // Extract contact information
    const contactResult = await hybridContactExtraction(url)

    // Build business result
    const businessResult = {
      name: businessAnalysis.businessName || "Unknown Business",
      phone: contactResult.phones[0] || "",
      email: contactResult.emails[0] || "",
      website: url,
      address: "", // Could be enhanced with address extraction
      category: businessAnalysis.businessType || "",
    }

    return businessResult
  } catch (error: any) {
    console.error(`❌ AI business extraction failed for ${url}:`, error.message)
    throw new Error(`AI extraction failed, no business information could be extracted`)
  }
}
