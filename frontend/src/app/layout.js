import './globals.css'
import ClientLayout from '@/components/ClientLayout'

export const metadata = {
  title: 'MisterTicket - Revolucionando los Conciertos',
  description: 'Red social para conciertos y venta de boletos segura.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-brand-50 font-sans text-brand-900">
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  )
}
