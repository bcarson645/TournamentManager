import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'TournamentManager – Hello World',
  description: 'Welcome to TournamentManager',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
