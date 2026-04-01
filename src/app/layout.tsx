import type { Metadata } from "next"
import "./globals.css"
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "CPS Staff Portal",
  description: "Chicago Public Schools internal application platform",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={cn("h-full", "font-sans", geist.variable)}>
      <body className="min-h-full">{children}</body>
    </html>
  )
}
