import type { Metadata, Viewport } from 'next';
import './globals.css';
import './design-system.css';
import './ui-compat.css';
import './ui-reference.css';
import './account-polish.css';
import './e2e-hardening.css';
import './final-ui-polish.css';
import './request-detail-v3.css';
import './airbnb-theme.css';
import './global-buttons.css';
import './blue-accent.css';
import './dual-mode.css';
import './dual-mode-extras.css';
import './unified-ui.css';
import './p1-detail-screens.css';
import './p1-customer-home-wizard.css';
import './p1-provider-work.css';
import './p1-remaining-consistency.css';
import './global-role-menu.css';
import './profile-flat.css';
import './customer-home-cleanup.css';
import './landing-blue.css';
import './mobile-date-input-fix.css';
import './remove-save-draft.css';
import './disable-request-urgency.css';
import './mobile-viewport-hardening.css';
import './mobile-keyboard-hardening.css';
import './mobile-compliance-v2.css';
import './mobile-compliance-v3.css';
import ThemeRuntime from './ThemeRuntime';
import ModeToast from './ModeToast';
import ResponsiveRuntime from './ResponsiveRuntime';
import RoleAccessGuard from './RoleAccessGuard';
import GlobalRoleMenu from './GlobalRoleMenu';
import GlobalCardPagination from './GlobalCardPagination';
import MobileDateInputRuntime from './MobileDateInputRuntime';
import MobileKeyboardRuntime from './MobileKeyboardRuntime';
import NewRequestRuntime from './NewRequestRuntime';
import PreferredDateRuntime from './PreferredDateRuntime';
import SendRequestTapRuntime from './SendRequestTapRuntime';

export const metadata: Metadata = {
  title: 'FixIt Maldives',
  description: 'Local service requests matched with trusted providers in Maldives.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><ThemeRuntime/><ResponsiveRuntime/><MobileKeyboardRuntime/><SendRequestTapRuntime/><RoleAccessGuard/><NewRequestRuntime/><PreferredDateRuntime/><GlobalRoleMenu/><GlobalCardPagination/><MobileDateInputRuntime/>{children}<ModeToast/></body>
    </html>
  );
}
