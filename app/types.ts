export interface BusinessResult {
  name: string
  phone: string
  email: string
  website: string
  address: string
  category: string
}

export interface PaginationInfo {
  currentPage: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  totalPages: number
  totalResults: number
}

export interface SearchResponse {
  businesses: BusinessResult[]
  pagination: PaginationInfo
}

export interface CustomWebsiteInput {
  url: string
  businessName?: string
}

export interface CustomScrapeResponse {
  businesses: BusinessResult[]
  errors: string[]
}

export interface DetailedError {
  url: string
  error: string
  category: "validation" | "network" | "content" | "timeout" | "unknown"
}

export interface ScrapeStats {
  total: number
  successful: number
  failed: number
  errorsByCategory: Record<string, number>
}

export interface EnhancedCustomScrapeResponse extends CustomScrapeResponse {
  stats?: ScrapeStats
  detailedErrors?: DetailedError[]
}
