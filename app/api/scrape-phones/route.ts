import { type NextRequest, NextResponse } from "next/server"
import { extractPhoneFromWebsite } from "@/app/phone-extractor"
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

    // Process websites in batches to extract phone numbers
    for (let i = 0; i < updatedBusinesses.length; i += concurrencyLimit) {
      const batch = updatedBusinesses.slice(i, i + concurrencyLimit)
      const batchPromises = batch.map(async (business, batchIndex) => {
        const index = i + batchIndex

        if (business.website && !business.phone) {
          try {
            console.log(`Extracting phone from ${business.website}`)
            const phone = await extractPhoneFromWebsite(business.website)

            if (phone) {
              console.log(`Found phone: ${phone} for ${business.name}`)
              updatedBusinesses[index] = {
                ...business,
                phone,
              }
            } else {
              console.log(`No phone found for ${business.name}`)
            }
          } catch (error) {
            console.error(`Error extracting phone for ${business.name}:`, error)
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
    console.error("Error in scrape-phones API route:", error)
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 })
  }
}
