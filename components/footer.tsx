import { Heart } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t border-border/30 bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto py-6 px-4 text-center">
        <p className="text-sm text-muted-foreground">
          Grabbit — Made with <Heart className="inline-block w-4 h-4 text-red-500 mx-1" /> by{" "}
          <a
            href="https://github.com/madegit/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:underline transition-colors"
          >
            madé
          </a>
        </p>
      </div>
    </footer>
  )
}
