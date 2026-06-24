import type { Metadata } from 'next'
import './globals.css'
import TopNav from '@/components/TopNav'
import BottomNav from '@/components/BottomNav'

export const metadata: Metadata = {
  title: 'CU Dashboard',
  description: 'Credit Union Manager',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TopNav />
        <main
          style={{
            maxWidth: 480,
            margin: '0 auto',
            padding: '24px 20px',
            /* bottom padding so content clears the fixed bottom nav on mobile */
            paddingBottom: 80,
            minHeight: '100vh',
          }}
        >
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  )
}
