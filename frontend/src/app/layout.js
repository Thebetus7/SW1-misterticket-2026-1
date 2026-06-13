import './globals.css'
import Navbar from '@/components/Navbar'

export const metadata = {
  title: 'MisterTicket - Revolucionando los Conciertos',
  description: 'Red social para conciertos y venta de boletos segura.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-brand-50 font-sans text-brand-900">
        <Navbar />
        {children}
      </body>
    </html>
  )
}
