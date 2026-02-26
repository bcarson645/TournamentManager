import type { Metadata } from 'next'
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
        <header className="header">
          <div className="header-title">
            Tournament<span>Manager</span>
          </div>
        </header>
        {children}
      </body>
    </html>
  )
}
