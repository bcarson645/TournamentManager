import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TournamentManager – Coverage Schedule',
  description: 'Coverage schedule prototype',
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
          <h1 className="header-title">Tournament<span>Manager</span></h1>
        </header>
        {children}
      </body>
    </html>
  )
}
