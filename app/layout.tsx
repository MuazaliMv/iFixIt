import type { Metadata } from 'next';
import './globals.css';
import './ui-compat.css';
import './ui-reference.css';
import './iphone-audit.css';
import './account-polish.css';
import './e2e-hardening.css';
import './final-ui-polish.css';
import './premium-customer.css';
import ThemeRuntime from './ThemeRuntime';
import RouteMobileNav from './RouteMobileNav';

export const metadata: Metadata = {
  title: 'FixIt Maldives',
  description: 'Local service requests matched with trusted providers in Maldives.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><ThemeRuntime/>{children}<RouteMobileNav/></body>
    </html>
  );
}
