import type { Metadata } from 'next';
import './globals.css';
import './design-system.css';
import './ui-compat.css';
import './ui-reference.css';
import './iphone-audit.css';
import './account-polish.css';
import './e2e-hardening.css';
import './final-ui-polish.css';
import './request-detail-v3.css';
import './airbnb-theme.css';
import './global-buttons.css';
import './blue-accent.css';
import './dual-mode.css';
import './dual-mode-extras.css';
import ThemeRuntime from './ThemeRuntime';
import RouteMobileNav from './RouteMobileNav';
import ModeToast from './ModeToast';
import GlobalModeSwitch from './GlobalModeSwitch';

export const metadata: Metadata = {
  title: 'FixIt Maldives',
  description: 'Local service requests matched with trusted providers in Maldives.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><ThemeRuntime/>{children}<RouteMobileNav/><GlobalModeSwitch/><ModeToast/></body>
    </html>
  );
}
