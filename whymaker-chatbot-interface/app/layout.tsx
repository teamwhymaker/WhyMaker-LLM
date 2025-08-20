import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'

export const metadata: Metadata = {
  title: 'WhyMaker Chatbot',
  description: 'AI-powered chatbot for WhyMaker - Get instant answers to your questions',
  generator: 'WhyMaker',
  icons: {
    icon: '/images/WhyMaker Logo Mark-05.svg',
    shortcut: '/images/WhyMaker Logo Mark-05.svg',
    apple: '/images/WhyMaker Logo Mark-05.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  )
}
