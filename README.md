# Grabbit 🐰

**The AI-powered way to fetch web data**

Grabbit is a modern web scraping application that combines artificial intelligence with traditional extraction methods to make it easy to extract business information from Google search results and custom websites. Built with Next.js and featuring a clean, minimalist interface inspired by modern design principles.

## ✨ Features

### 🔍 Google Business Search
- Search for businesses by type and location
- Extract business names, categories, addresses, and basic contact info
- Paginated results with smooth navigation
- Intelligent retry logic for rate limiting

### 🌐 Custom Website Scraping
- Scrape multiple websites simultaneously
- Extract emails and phone numbers from business websites
- Support for contact page discovery
- Batch processing with concurrency limits

### 🤖 AI-Enhanced Extraction
- **Smart Business Detection**: AI identifies and extracts business information with high accuracy
- **Intelligent Contact Discovery**: Advanced algorithms find hidden contact information
- **Context-Aware Processing**: AI understands business context for better extraction
- **Fallback System**: Traditional regex-based extraction when AI is unavailable

### 📧 Advanced Contact Extraction
- **Email Discovery**: Finds emails in page content, mailto links, and contact pages
- **Phone Number Extraction**: Supports multiple formats (US, international, mobile)
- **Smart Filtering**: Removes placeholder and invalid contact information
- **Duplicate Detection**: AI-powered similarity matching to remove duplicates

### 📊 Data Export
- Export to CSV, JSON, or TXT formats
- Customizable field selection
- Filter options (e.g., businesses without websites)
- Bulk download capabilities

### 🎨 Modern Design
- Minimalist interface with sage green color scheme
- Geist Mono typography for technical aesthetic
- Outline-only design with no shadows or backgrounds
- Responsive layout for all devices

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm, yarn, pnpm, or bun
- OpenAI API key (optional, for AI features)

### Installation

1. **Clone the repository**
   \`\`\`bash
   git clone https://github.com/madegit/grabbit.git
   cd grabbit
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   \`\`\`

3. **Set up environment variables** (optional)
   \`\`\`bash
   # Create .env.local file
   OPENAI_API_KEY=your_openai_api_key_here
   \`\`\`

4. **Run the development server**
   \`\`\`bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   \`\`\`

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Web Scraping**: Cheerio
- **AI Integration**: OpenAI GPT-4
- **Icons**: Lucide React
- **Font**: Geist Mono

## 📖 Usage

### Google Search Mode

1. **Enter Business Type**: e.g., "wedding photographers", "restaurants"
2. **Add Location** (optional): e.g., "New York", "London"
3. **Click Search**: Grabbit will fetch results from Google
4. **Extract Contacts**: Use the "Extract Emails" and "Extract Phones" buttons
5. **Export Data**: Choose your preferred format and download

### Custom Website Mode

1. **Enter Website URLs**: One per line (http/https optional)
2. **Add Context** (optional): Business type and location for better AI extraction
3. **Click Scrape**: Grabbit will process all websites with AI assistance
4. **Review Results**: Check extracted business information
5. **Export Data**: Download in your preferred format

## 🤖 AI Features

### Intelligent Business Extraction
Grabbit uses OpenAI's GPT-4 to:
- **Understand Context**: Analyzes website content to identify business information
- **Extract Structured Data**: Converts unstructured text into organized business profiles
- **Validate Information**: Ensures extracted data is accurate and properly formatted
- **Handle Edge Cases**: Processes complex layouts and non-standard formats

### Smart Fallback System
- **Hybrid Approach**: AI-first with traditional regex fallback
- **Graceful Degradation**: Works even without OpenAI API key
- **Cost Optimization**: Efficient token usage and caching
- **Error Recovery**: Automatic retry with different strategies

## 🔧 Configuration

### Rate Limiting
Grabbit includes intelligent retry logic for Google searches:
- **Retry Attempts**: 3 attempts with exponential backoff
- **Backoff Delays**: 2s → 5s → 10s
- **Concurrency Limits**: 3 websites processed simultaneously

### AI Settings
- **Model**: GPT-4 for optimal accuracy
- **Token Optimization**: Efficient prompt engineering
- **Caching**: Results cached to reduce API calls
- **Fallback**: Traditional extraction when AI unavailable

### Extraction Settings
- **Email Patterns**: Supports standard email formats with spam filtering
- **Phone Patterns**: US, international, and mobile number formats
- **Timeout Limits**: 15s for main pages, 10s for contact pages

## 📁 Project Structure

\`\`\`
grabbit/
├── app/
│   ├── actions.ts              # Server actions for Google search
│   ├── ai-enhanced-extractor.ts # AI-powered extraction logic
│   ├── email-extractor.ts      # Email extraction logic
│   ├── phone-extractor.ts      # Phone number extraction
│   ├── custom-website-scraper.ts # Custom website scraping
│   ├── data-validator.ts       # Data validation utilities
│   ├── duplicate-detector.ts   # AI-powered duplicate detection
│   ├── cache-manager.ts        # Intelligent caching system
│   ├── types.ts               # TypeScript interfaces
│   ├── globals.css            # Global styles
│   ├── layout.tsx             # Root layout
│   ├── page.tsx               # Main application
│   └── api/
│       ├── scrape-emails/     # Email extraction API
│       ├── scrape-phones/     # Phone extraction API
│       └── scrape-custom-websites/ # Custom scraping API
├── components/
│   ├── ui/                    # shadcn/ui components
│   ├── export-dialog.tsx      # Export functionality
│   └── footer.tsx             # Footer component
└── README.md
\`\`\`

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Guidelines

- Use TypeScript for all new code
- Follow the existing code style and formatting
- Add appropriate error handling
- Test your changes thoroughly
- Update documentation as needed
- Consider AI integration opportunities

## ⚠️ Legal Considerations

- **Respect robots.txt**: Always check website scraping policies
- **Rate Limiting**: Don't overwhelm servers with requests
- **Data Usage**: Only use scraped data for legitimate purposes
- **Privacy**: Handle personal information responsibly
- **Terms of Service**: Comply with website terms and conditions
- **AI Ethics**: Use AI responsibly and transparently

## 🐛 Troubleshooting

### Common Issues

**429 Rate Limiting Errors**
- Grabbit automatically retries with backoff
- If persistent, wait a few minutes before trying again

**No Results Found**
- Try different search terms or locations
- Check if the business type is too specific

**AI Extraction Fails**
- Verify OpenAI API key is set correctly
- Check API quota and billing status
- Traditional extraction will be used as fallback

**Email/Phone Extraction Fails**
- Some websites block automated access
- Contact pages may require JavaScript rendering
- AI extraction may help with complex layouts

**Export Not Working**
- Ensure you have selected at least one field
- Check that there are results to export

## 💡 Tips for Better Results

### AI-Enhanced Extraction
- **Provide Context**: Add business type and location for better AI understanding
- **Quality URLs**: Use direct business website URLs rather than directory listings
- **Batch Processing**: Process multiple similar businesses together for consistency

### Traditional Extraction
- **Contact Pages**: Many businesses have dedicated contact pages with more information
- **About Pages**: Often contain business details and contact information
- **Footer Sections**: Check website footers for contact details

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAI**: For providing powerful AI capabilities
- **Design Inspiration**: Modern mobile app interfaces
- **shadcn/ui**: Beautiful UI components
- **Vercel**: Hosting and deployment platform
- **Next.js Team**: Amazing React framework

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/madegit/grabbit/issues) page
2. Create a new issue with detailed information
3. Include error messages and steps to reproduce

---

**Made with 🤖 AI + ❤️ by the Grabbit team**

*Grabbit - The AI-powered way to fetch web data* 🐰✨
