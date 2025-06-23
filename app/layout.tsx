import type React from "react"
import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Grabbit - The fun way to fetch web data",
  description:
    "AI-powered web scraping tool that makes it easy to search and extract business information from Google search results and custom websites. Features intelligent contact extraction, duplicate detection, and smart data validation.",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@100..900&display=swap" rel="stylesheet" />
      </head>
      <body className="font-mono">{children}</body>
    </html>
  )
}
