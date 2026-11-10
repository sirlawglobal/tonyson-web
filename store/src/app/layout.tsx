import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { MobileNav } from '@/components/mobile-nav';
import { CartDrawer } from '@/components/cart-drawer';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const display = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-display', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Tonyson Virtual Supermarket', template: '%s · Tonyson' },
  description: 'Fresh groceries, delivered fast. Shop fruit, veg, meat, pantry staples and more from Tonyson.',
  icons: { icon: '/logo.svg' },
};
export const viewport: Viewport = { themeColor: '#15803d', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${display.variable}`}>
      <body className="min-h-dvh pb-20 md:pb-0">
        <Providers>
          <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-white">
            Skip to content
          </a>
          <Header />
          <main id="main">{children}</main>
          <Footer />
          <MobileNav />
          <CartDrawer />
        </Providers>
      </body>
    </html>
  );
}
