import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity } from "lucide-react"

export default function Home() {
  // Use env var if set, otherwise default to production API
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.tidyfeed.app'

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <div className="mb-8 flex items-center gap-2">
        <Activity className="h-6 w-6" />
        <span className="text-xl font-bold">TidyFeed</span>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription>
            Sign in to your account to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Button asChild className="w-full" size="lg">
            <Link href={`${apiUrl}/auth/login/google`}>
              Login with Google
            </Link>
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or
              </span>
            </div>
          </div>

          <Button variant="outline" asChild className="w-full">
            <Link href="/dashboard">
              Go to Dashboard
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="mt-6 flex flex-col items-center gap-2">
        <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Privacy Policy
        </Link>
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} TidyFeed. All rights reserved.
        </p>
      </div>
    </div>
  )
}
