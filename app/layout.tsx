import type { Metadata } from 'next'
import { Instrument_Sans, Staatliches, IBM_Plex_Mono } from 'next/font/google'
import '@/app/globals.css'

const instrumentSans = Instrument_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

const staatliches = Staatliches({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['400'],
})

const ibmPlexMono = IBM_Plex_Mono({
  variable: '--font-code',
  subsets: ['latin'],
  weight: ['400', '500'],
})

export const metadata: Metadata = {
  title: 'Giumello Express',
  description: 'Gestione navette Flylibell',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={`${instrumentSans.variable} ${staatliches.variable} ${ibmPlexMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}