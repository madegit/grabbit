import { type NextRequest, NextResponse } from "next/server"
import { extractEmailFromWebsite } from "@/app/email-extractor"
import { DuplicateDetector } from "@/app/duplicate-detector"
import type { BusinessResult } from "@/app/types"

export async function POST(request: NextRequest) {
  try {
    const { businesses } = (await request.json()) as { businesses: BusinessResult[] }

    if (!businesses || !Array.isArray(businesses)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    // Process businesses in parallel with a concurrency limit
    const concurrencyLimit = 3
    const updatedBusinesses: BusinessResult[] = [...businesses]

    // Process websites in batches to extract emails
    for (let i = 0; i < updatedBusinesses.length; i += concurrencyLimit) {
      const batch = updatedBusinesses.slice(i, i + concurrencyLimit)
      const batchPromises = batch.map(async (business, batchIndex) => {
        const index = i + batchIndex

        if (business.website && !business.email) {
          try {
            console.log(`Extracting email from ${business.website}`)
            const email = await extractEmailFromWebsite(business.website)

            if (email) {
              console.log(`Found email: ${email} for ${business.name}`)
              updatedBusinesses[index] = {
                ...business,
                email,
              }
            } else {
              console.log(`No email found for ${business.name}`)
            }
          } catch (error) {
            console.error(`Error extracting email for ${business.name}:`, error)
          }
        }
      })

      // Wait for the current batch to complete before moving to the next
      await Promise.all(batchPromises)
    }

    // Remove any duplicates that might have been introduced
    const uniqueBusinesses = DuplicateDetector.removeDuplicates(updatedBusinesses)

    return NextResponse.json({ businesses: uniqueBusinesses })
  } catch (error) {
    console.error("Error in scrape-emails API route:", error)
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 })
  }
}
