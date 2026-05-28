import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Yolustu',
  description: 'Bakıda sürücü və sərnişinləri birləşdirən icma platforma',
}

export default function RootLayout({ children }) {
  return (
    <html lang="az">
      <head>
        <script src="https://telegram.org/js/telegram-web-app.js"></script>
      </head>
      <body>{children}</body>
    </html>
  )
}