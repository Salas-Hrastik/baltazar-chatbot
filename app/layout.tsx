import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Baltazar — AI Asistent',
  description: 'AI asistent za visoko obrazovanje, turizam i ugostiteljstvo',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="hr">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
