import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import './globals.css'
import { AuthProvider } from '@/context/AuthContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: "Average Joe's Workout Tracker",
  description: 'Track your workouts, log your progress, and get AI-powered workout plans tailored to your goals.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#1f1f1f',
                color: '#f5f5f5',
                border: '1px solid #2a2a2a',
                fontSize: '14px',
              },
              success: { iconTheme: { primary: '#22c55e', secondary: '#1f1f1f' } },
              error:   { iconTheme: { primary: '#ef4444', secondary: '#1f1f1f' } },
              duration: 3000,
            }}
          />
        </AuthProvider>
      </body>
    </html>
  )
}
