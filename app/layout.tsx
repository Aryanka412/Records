import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { readSupabaseEnv } from "../lib/supabaseEnv"
import "./globals.css"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "Records — Rate, review & discover music",
  description:
    "Keep a record of the music you love. Rate albums, review songs, and share your taste with the community.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <script
          id="records-supabase-config"
          type="application/json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(readSupabaseEnv()).replace(/</g, "\\u003c"),
          }}
        />
        {children}
      </body>
    </html>
  )
}
