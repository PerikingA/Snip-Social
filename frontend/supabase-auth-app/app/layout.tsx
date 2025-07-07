import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'sonner'
import ClientSessionProvider from '@/components/ClientSessionProvider'

export const metadata: Metadata = {
  title: 'SnipSocial',
  description: 'AI for viral content repurposing',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ClientSessionProvider>
          {children}
          <Toaster richColors />
        </ClientSessionProvider>
      </body>
    </html>
  )
}
