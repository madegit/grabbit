"use client"

import type React from "react"

import { useState } from "react"
import { Search, ChevronLeft, ChevronRight, Mail, Phone, Globe, Users, MapPin, Brain } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { searchBusinesses } from "@/app/actions"
import type { BusinessResult, PaginationInfo } from "@/app/types"
import { ExportDialog } from "@/components/export-dialog"
import { Footer } from "@/components/footer"

export default function Home() {
  const [query, setQuery] = useState("")
  const [location, setLocation] = useState("")
  const [customBusinessType, setCustomBusinessType] = useState("")
  const [customLocation, setCustomLocation] = useState("")
  const [results, setResults] = useState<BusinessResult[]>([])
  const [allAccumulatedResults, setAllAccumulatedResults] = useState<BusinessResult[]>([])
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [isExtractingEmails, setIsExtractingEmails] = useState(false)
  const [currentSearch, setCurrentSearch] = useState("")
  const [emailExtractionStatus, setEmailExtractionStatus] = useState<string | null>(null)
  const [isExtractingPhones, setIsExtractingPhones] = useState(false)
  const [phoneExtractionStatus, setPhoneExtractionStatus] = useState<string | null>(null)
  const [customWebsites, setCustomWebsites] = useState("")
  const [isCustomScraping, setIsCustomScraping] = useState(false)
  const [customScrapeStatus, setCustomScrapeStatus] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("google-search")

  const extractEmails = async () => {
    if (!allAccumulatedResults.length) return

    setIsExtractingEmails(true)
    setEmailExtractionStatus("🤖 Starting AI-enhanced email extraction...")

    try {
      const response = await fetch("/api/scrape-emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ businesses: allAccumulatedResults }),
      })

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`)
      }

      const data = await response.json()

      if (data.businesses) {
        // Update both current results and accumulated results
        setAllAccumulatedResults(data.businesses)

        // Update current page results with the updated data
        const currentPageStart = ((pagination?.currentPage || 1) - 1) * 10
        const currentPageEnd = currentPageStart + 10
        setResults(data.businesses.slice(currentPageStart, currentPageEnd))

        const emailsFound = data.businesses.filter((b) => b.email).length
        setEmailExtractionStatus(`✅ AI found ${emailsFound} email${emailsFound !== 1 ? "s" : ""} across all pages`)
      } else {
        setEmailExtractionStatus("❌ No emails found")
      }
    } catch (error) {
      console.error("Failed to extract emails:", error)
      setEmailExtractionStatus("❌ AI extraction failed. Please try again.")
    } finally {
      setIsExtractingEmails(false)
    }
  }

  const extractPhones = async () => {
    if (!allAccumulatedResults.length) return

    setIsExtractingPhones(true)
    setPhoneExtractionStatus("🤖 Starting AI-enhanced phone extraction...")

    try {
      const response = await fetch("/api/scrape-phones", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ businesses: allAccumulatedResults }),
      })

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`)
      }

      const data = await response.json()

      if (data.businesses) {
        // Update both current results and accumulated results
        setAllAccumulatedResults(data.businesses)

        // Update current page results with the updated data
        const currentPageStart = ((pagination?.currentPage || 1) - 1) * 10
        const currentPageEnd = currentPageStart + 10
        setResults(data.businesses.slice(currentPageStart, currentPageEnd))

        const phonesFound = data.businesses.filter((b) => b.phone).length
        setPhoneExtractionStatus(
          `✅ AI found ${phonesFound} phone number${phonesFound !== 1 ? "s" : ""} across all pages`,
        )
      } else {
        setPhoneExtractionStatus("❌ No phone numbers found")
      }
    } catch (error) {
      console.error("Failed to extract phones:", error)
      setPhoneExtractionStatus("❌ AI extraction failed. Please try again.")
    } finally {
      setIsExtractingPhones(false)
    }
  }

  const handleCustomScrape = async () => {
    if (!customWebsites.trim()) {
      setError("Please enter at least one website URL")
      return
    }

    setIsCustomScraping(true)
    setCustomScrapeStatus("🤖 AI is analyzing and processing websites...")
    setError("")

    try {
      const websites = customWebsites
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)

      if (websites.length === 0) {
        setError("Please enter valid website URLs")
        return
      }

      if (websites.length > 50) {
        setCustomScrapeStatus(`🤖 AI processing first 50 of ${websites.length} websites...`)
      }

      const response = await fetch("/api/scrape-custom-websites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          websites,
          businessType: customBusinessType.trim() || undefined,
          location: customLocation.trim() || undefined,
        }),
      })

      // Check if response is ok
      if (!response.ok) {
        const errorText = await response.text()
        console.error("API Error Response:", errorText)
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`)
      }

      // Parse JSON response
      let data
      try {
        const responseText = await response.text()
        console.log("Raw API Response:", responseText)
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error("JSON Parse Error:", parseError)
        throw new Error("Invalid response format from server")
      }

      // Check if we have businesses data
      if (data && Array.isArray(data.businesses)) {
        setResults(data.businesses)
        setAllAccumulatedResults(data.businesses)
        setPagination(null)

        let searchTerm = "AI-Enhanced Custom Scrape"
        if (customBusinessType || customLocation) {
          const parts = []
          if (customBusinessType) parts.push(customBusinessType)
          if (customLocation) parts.push(`in ${customLocation}`)
          searchTerm = `AI Custom: ${parts.join(" ")}`
        }
        setCurrentSearch(searchTerm)

        // Enhanced status message with AI insights
        const stats = data.stats || {
          successful: data.businesses.length,
          failed: data.errors?.length || 0,
          total: data.businesses.length + (data.errors?.length || 0),
        }

        let statusMessage = `✅ AI successfully analyzed ${stats.successful} of ${stats.total} websites`

        if (stats.failed > 0) {
          statusMessage += ` (${stats.failed} failed)`
        }

        setCustomScrapeStatus(statusMessage)

        // Log detailed errors for debugging
        if (data.detailedErrors && data.detailedErrors.length > 0) {
          console.group("AI extraction detailed errors:")
          data.detailedErrors.forEach((error: any) => {
            console.log(`${error.category?.toUpperCase() || "UNKNOWN"}: ${error.url} - ${error.error}`)
          })
          console.groupEnd()
        }
      } else {
        // Handle case where no businesses were found
        setResults([])
        setAllAccumulatedResults([])
        setCustomScrapeStatus("❌ AI could not extract data from the provided websites")

        if (data.error) {
          setError(data.error)
        }
      }
    } catch (error) {
      console.error("Failed to scrape custom websites:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      setCustomScrapeStatus(`❌ AI extraction failed: ${errorMessage}`)
      setError(errorMessage)

      // Clear results on error
      setResults([])
      setAllAccumulatedResults([])
    } finally {
      setIsCustomScraping(false)
    }
  }

  const handleSearch = async (e: React.FormEvent, page = 1) => {
    if (e) e.preventDefault()

    if (!query.trim() && !currentSearch) {
      setError("Please enter a search query")
      return
    }

    setLoading(true)
    setError("")
    setEmailExtractionStatus(null)
    setPhoneExtractionStatus(null)

    try {
      const searchQuery = page > 1 && currentSearch ? currentSearch : location ? `${query} in ${location}` : query

      if (page === 1) {
        setCurrentSearch(searchQuery)
        // Clear accumulated results when starting a new search
        setAllAccumulatedResults([])
      }

      const data = await searchBusinesses(searchQuery, page)
      setResults(data.businesses)
      setPagination(data.pagination)

      // Accumulate results across pages
      if (page === 1) {
        setAllAccumulatedResults(data.businesses)
      } else {
        setAllAccumulatedResults((prev) => {
          // Remove duplicates by name and merge new results
          const existingNames = new Set(prev.map((b) => b.name))
          const newBusinesses = data.businesses.filter((b) => !existingNames.has(b.name))
          return [...prev, ...newBusinesses]
        })
      }
    } catch (err) {
      setError("Failed to fetch results. Please try again.")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || (pagination && newPage > pagination.totalPages)) return
    handleSearch(null as any, newPage)
  }

  const clearResults = () => {
    setResults([])
    setAllAccumulatedResults([])
    setPagination(null)
    setCurrentSearch("")
    setEmailExtractionStatus(null)
    setPhoneExtractionStatus(null)
    setCustomScrapeStatus(null)
    setError("")
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    clearResults()
  }

  // Use accumulated results for stats
  const totalBusinesses = allAccumulatedResults.length
  const businessesWithPhone = allAccumulatedResults.filter((b) => b.phone && b.phone.trim() !== "").length
  const businessesWithEmail = allAccumulatedResults.filter((b) => b.email && b.email.trim() !== "").length
  const businessesWithWebsite = allAccumulatedResults.filter((b) => b.website && b.website.trim() !== "").length

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#eaf1e5" }}>
      <div className="container mx-auto py-12 px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-medium text-foreground mb-3">Grabbit</h1>
          <p className="text-muted-foreground text-sm md:text-base flex items-center justify-center gap-2">
            <Brain className="h-4 w-4" strokeWidth={1} />
            AI-powered web data extraction
          </p>
        </div>

        {/* Search Section */}
        <div className="card-outline p-4 md:p-8 mb-6 md:mb-8">
          <div className="mb-4 md:mb-6">
            <h2 className="text-lg md:text-xl font-medium mb-2 flex items-center gap-2">
              <Brain className="h-5 w-5" strokeWidth={1} />
              AI-Enhanced Search & Extract
            </h2>
            <p className="text-sm md:text-base text-muted-foreground">
              Find businesses or scrape custom websites with AI-powered contact extraction
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <div className="flex border border-border/40 rounded-2xl p-1 mb-6 md:mb-8 bg-transparent">
              <button
                onClick={() => setActiveTab("google-search")}
                className={`flex-1 py-2 px-2 md:px-4 rounded-xl text-xs md:text-sm font-medium transition-colors ${
                  activeTab === "google-search"
                    ? "bg-foreground text-background"
                    : "bg-transparent text-foreground hover:bg-border/10"
                }`}
              >
                <Search className="h-4 w-4 inline mr-1 md:mr-2" strokeWidth={1} />
                <span className="hidden sm:inline">Google Search</span>
                <span className="sm:hidden">Google</span>
              </button>
              <button
                onClick={() => setActiveTab("custom-websites")}
                className={`flex-1 py-2 px-2 md:px-4 rounded-xl text-xs md:text-sm font-medium transition-colors ${
                  activeTab === "custom-websites"
                    ? "bg-foreground text-background"
                    : "bg-transparent text-foreground hover:bg-border/10"
                }`}
              >
                <Brain className="h-4 w-4 inline mr-1 md:mr-2" strokeWidth={1} />
                <span className="hidden sm:inline">AI Custom Scrape</span>
                <span className="sm:hidden">AI Custom</span>
              </button>
            </div>

            <TabsContent value="google-search" className="space-y-6">
              <form onSubmit={(e) => handleSearch(e)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm md:text-base font-medium flex items-center gap-2">
                      <Users className="h-4 w-4" strokeWidth={1} />
                      Business Type
                    </label>
                    <Input
                      placeholder="wedding photographers, restaurants..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      required
                      className="input-outline"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm md:text-base font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4" strokeWidth={1} />
                      Location
                    </label>
                    <Input
                      placeholder="New York, London..."
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="input-outline"
                    />
                  </div>
                </div>
                <Button type="submit" disabled={loading || isCustomScraping} className="button-filled w-full">
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border border-current border-t-transparent"></div>
                      Searching...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Search className="h-4 w-4" strokeWidth={1} />
                      <span className="text-sm">Search Google</span>
                    </span>
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="custom-websites" className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm md:text-base font-medium flex items-center gap-2">
                    <Globe className="h-4 w-4" strokeWidth={1} />
                    Website URLs
                  </label>
                  <textarea
                    className="w-full min-h-[100px] p-3 border border-border/40 rounded-2xl bg-transparent resize-vertical text-sm font-mono"
                    placeholder={`example.com
another-website.com
business-site.com`}
                    value={customWebsites}
                    onChange={(e) => setCustomWebsites(e.target.value)}
                  />
                </div>

                <Button
                  onClick={handleCustomScrape}
                  disabled={isCustomScraping || loading}
                  className="button-filled w-full"
                >
                  {isCustomScraping ? (
                    <span className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border border-current border-t-transparent"></div>
                      AI Analyzing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Brain className="h-4 w-4" strokeWidth={1} />
                      <span className="text-sm">AI Scrape Websites</span>
                    </span>
                  )}
                </Button>
                {customScrapeStatus && (
                  <div className="p-3 border border-border/40 rounded-2xl bg-transparent">
                    <p className="text-sm">{customScrapeStatus}</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {error && (
            <div className="mt-4 p-3 border border-destructive/40 rounded-2xl bg-transparent">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Stats */}
        {allAccumulatedResults.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
            <div className="card-outline p-3 md:p-4 text-center">
              <div className="text-2xl md:text-3xl font-medium">{totalBusinesses}</div>
              <div className="text-xs md:text-sm text-muted-foreground">BUSINESSES</div>
            </div>
            <div className="card-outline p-3 md:p-4 text-center">
              <div className="text-2xl md:text-3xl font-medium">{businessesWithPhone}</div>
              <div className="text-xs md:text-sm text-muted-foreground">PHONES</div>
            </div>
            <div className="card-outline p-3 md:p-4 text-center">
              <div className="text-2xl md:text-3xl font-medium">{businessesWithEmail}</div>
              <div className="text-xs md:text-sm text-muted-foreground">EMAILS</div>
            </div>
            <div className="card-outline p-3 md:p-4 text-center">
              <div className="text-2xl md:text-3xl font-medium">{businessesWithWebsite}</div>
              <div className="text-xs md:text-sm text-muted-foreground">WEBSITES</div>
            </div>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="card-outline">
            <div className="p-4 md:p-6 border-b border-border/30">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg md:text-xl font-medium flex items-center gap-2">
                    <Brain className="h-5 w-5" strokeWidth={1} />
                    AI-Enhanced Results
                  </h3>
                  <div className="text-sm md:text-base text-muted-foreground mt-1">
                    {currentSearch && <span>{currentSearch}</span>}
                    {pagination && (
                      <span className="block sm:inline sm:ml-4">
                        Page {pagination.currentPage} of {pagination.totalPages || "?"} • {totalBusinesses} total
                        businesses
                      </span>
                    )}
                  </div>
                </div>
                <ExportDialog
                  businesses={allAccumulatedResults}
                  disabled={loading || isExtractingEmails || isExtractingPhones || isCustomScraping}
                />
              </div>
            </div>

            <div className="p-4 md:p-6">
              <div className="space-y-0">
                {results.map((business, index) => (
                  <div key={index} className={`py-3 md:py-4 ${index < results.length - 1 ? "list-separator" : ""}`}>
                    <div className="space-y-2 md:space-y-0 md:grid md:grid-cols-6 md:gap-4 text-sm">
                      {/* Business name and category - full width on mobile */}
                      <div className="md:col-span-2">
                        <div className="font-medium text-base md:text-sm">{business.name}</div>
                        {business.category && (
                          <div className="text-muted-foreground text-xs mt-1">
                            {business.category.length > 60
                              ? `${business.category.substring(0, 60)}...`
                              : business.category}
                          </div>
                        )}
                      </div>

                      {/* Contact info - stacked on mobile, grid on desktop */}
                      <div className="grid grid-cols-2 gap-2 md:contents">
                        <div className="flex items-center gap-1">
                          {business.phone ? (
                            <>
                              <Phone className="h-3 w-3 flex-shrink-0" strokeWidth={1} />
                              <span className="text-xs truncate">{business.phone}</span>
                            </>
                          ) : (
                            <span className="text-muted-foreground text-xs">No phone</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {business.email ? (
                            <>
                              <Mail className="h-3 w-3 flex-shrink-0" strokeWidth={1} />
                              <span className="text-xs truncate">{business.email}</span>
                            </>
                          ) : (
                            <span className="text-muted-foreground text-xs">No email</span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 md:contents">
                        <div className="flex items-center gap-1">
                          {business.website ? (
                            <a
                              href={business.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 hover:underline"
                            >
                              <Globe className="h-3 w-3 flex-shrink-0" strokeWidth={1} />
                              <span className="text-xs">Visit</span>
                            </a>
                          ) : (
                            <span className="text-muted-foreground text-xs">No website</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {business.address ? (
                            <>
                              <MapPin className="h-3 w-3 flex-shrink-0" strokeWidth={1} />
                              <span className="text-xs truncate">
                                {business.address.length > 25
                                  ? `${business.address.substring(0, 25)}...`
                                  : business.address}
                              </span>
                            </>
                          ) : (
                            <span className="text-muted-foreground text-xs">No address</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 md:p-6 border-t border-border/30">
              <div className="flex flex-col gap-4">
                {/* Pagination - only show on desktop for Google searches */}
                {pagination && !currentSearch.startsWith("AI Custom") && (
                  <div className="hidden sm:flex items-center justify-center gap-2">
                    <Button
                      onClick={() => handlePageChange(pagination?.currentPage! - 1)}
                      disabled={!pagination?.hasPreviousPage || loading}
                      className="button-outline"
                      size="sm"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" strokeWidth={1} />
                      Previous
                    </Button>

                    {pagination && pagination.totalPages > 0 && (
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                          let pageToShow
                          if (pagination.totalPages <= 5) {
                            pageToShow = i + 1
                          } else if (pagination.currentPage <= 3) {
                            pageToShow = i + 1
                          } else if (pagination.currentPage >= pagination.totalPages - 2) {
                            pageToShow = pagination.totalPages - 4 + i
                          } else {
                            pageToShow = pagination.currentPage - 2 + i
                          }

                          return (
                            <Button
                              key={pageToShow}
                              onClick={() => handlePageChange(pageToShow)}
                              disabled={loading}
                              className={pagination.currentPage === pageToShow ? "button-filled" : "button-outline"}
                              size="sm"
                            >
                              {pageToShow}
                            </Button>
                          )
                        })}
                      </div>
                    )}

                    <Button
                      onClick={() => handlePageChange(pagination?.currentPage! + 1)}
                      disabled={!pagination?.hasNextPage || loading}
                      className="button-outline"
                      size="sm"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" strokeWidth={1} />
                    </Button>
                  </div>
                )}

                {/* Mobile pagination - simplified */}
                {pagination && !currentSearch.startsWith("AI Custom") && (
                  <div className="flex sm:hidden items-center justify-between">
                    <Button
                      onClick={() => handlePageChange(pagination?.currentPage! - 1)}
                      disabled={!pagination?.hasPreviousPage || loading}
                      className="button-outline"
                      size="sm"
                    >
                      <ChevronLeft className="h-4 w-4" strokeWidth={1} />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {pagination.currentPage} / {pagination.totalPages || "?"}
                    </span>
                    <Button
                      onClick={() => handlePageChange(pagination?.currentPage! + 1)}
                      disabled={!pagination?.hasNextPage || loading}
                      className="button-outline"
                      size="sm"
                    >
                      <ChevronRight className="h-4 w-4" strokeWidth={1} />
                    </Button>
                  </div>
                )}

                {/* Status messages */}
                {(emailExtractionStatus || phoneExtractionStatus) && (
                  <div className="flex flex-col sm:flex-row gap-2 text-xs">
                    {emailExtractionStatus && (
                      <span className="border border-border/40 rounded-xl px-2 py-1 text-center">
                        {emailExtractionStatus}
                      </span>
                    )}
                    {phoneExtractionStatus && (
                      <span className="border border-border/40 rounded-xl px-2 py-1 text-center">
                        {phoneExtractionStatus}
                      </span>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={extractEmails}
                    disabled={isExtractingEmails || allAccumulatedResults.length === 0}
                    className="button-outline flex-1 sm:flex-none"
                    size="sm"
                  >
                    {isExtractingEmails ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent"></div>
                        <span className="text-xs">AI Extracting...</span>
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <Brain className="h-3 w-3" strokeWidth={1} />
                        <span className="text-sm">AI Extract Emails</span>
                      </span>
                    )}
                  </Button>
                  <Button
                    onClick={extractPhones}
                    disabled={isExtractingPhones || allAccumulatedResults.length === 0}
                    className="button-outline flex-1 sm:flex-none"
                    size="sm"
                  >
                    {isExtractingPhones ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent"></div>
                        <span className="text-xs">AI Extracting...</span>
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <Brain className="h-3 w-3" strokeWidth={1} />
                        <span className="text-sm">AI Extract Phones</span>
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}
