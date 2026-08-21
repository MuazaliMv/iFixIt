import type { Metadata } from 'next';
import './globals.css';
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
