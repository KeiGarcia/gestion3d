import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { AuthProvider } from '@/contexts/AuthContext'
import './globals.css'

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
})

export const metadata: Metadata = {
  title: '3DGestión — Sistema de Gestión para Impresión 3D',
  description: 'Gestiona materiales, pedidos y costos de tu emprendimiento de impresión 3D',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={geist.variable}>
      <body className="min-h-screen bg-slate-50">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
