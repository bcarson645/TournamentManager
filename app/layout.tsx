import type { Metadata } from 'next'
import Image from 'next/image'
import './globals.css'

export const metadata: Metadata = {
  title: 'TournamentManager',
  description: 'Manage teams and players across cricket tournaments',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <header className="header header-app">
          <Image
            src="/logo.png"
            alt=""
            width={280}
            height={56}
            priority
            className="header-logo"
          />
        </header>
        {children}
      </body>
    </html>
  )
}
