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
import './button-usability-hardening.css';
import './blue-accent.css';
import './dual-mode.css';
import './dual-mode-extras.css';
import './unified-ui.css';
import './p1-detail-screens.css';
import './p1-provider-work.css';
import './provider-work-apple.css';
import './p1-remaining-consistency.css';
import './global-role-menu.css';
import './profile-flat.css';
import './landing-blue.css';
import './mobile-date-input-fix.css';
import './remove-save-draft.css';
import './disable-request-urgency.css';
import './mobile-viewport-hardening.css';
import './mobile-keyboard-hardening.css';
import './mobile-compliance-v2.css';
import './mobile-compliance-v3.css';
import './apple-request-wizard.css';
import './apple-system.css';
import './workspace-system.css';
import './unified-control-family.css';
import './mobile-section-pager.css';
import './service-picker-ux.css';
import './ios-web-app.css';
import './global-shell.css';
import './request-wizard-smart-fix.css';
import './customer-home-usability-v2.css';
import './approved-customer-home.css';
import './desktop-mobile-shell.css';
import './frozen-request-flow.css';
import './customer-action-dock-overlap-fix.css';
import ThemeRuntime from './ThemeRuntime';
import ModeToast from './ModeToast';
import ResponsiveRuntime from './ResponsiveRuntime';
import MobileSectionPager from './MobileSectionPager';
import CompactCopyRuntime from './CompactCopyRuntime';
import ButtonUsabilityRuntime from './ButtonUsabilityRuntime';
import RoleAccessGuard from './RoleAccessGuard';
import GlobalRoleMenu from './GlobalRoleMenu';
import GlobalModeSwitch from './GlobalModeSwitch';
import TopWorkspaceRoleLabel from './TopWorkspaceRoleLabel';
import GlobalCardPagination from './GlobalCardPagination';
import MobileDateInputRuntime from './MobileDateInputRuntime';
import MobileKeyboardRuntime from './MobileKeyboardRuntime';
import PreferredDateRuntime from './PreferredDateRuntime';
import SendRequestTapRuntime from './SendRequestTapRuntime';
import RequestWizardSmartRuntime from './RequestWizardSmartRuntime';
import WorkspaceThemeRuntime from './WorkspaceThemeRuntime';
import ServerSessionSignOutSync from './ServerSessionSignOutSync';
import IOSWebAppShell from './IOSWebAppShell';
import ApprovedCustomerHomeRuntime from './ApprovedCustomerHomeRuntime';
import ErrorRuntime from './ErrorRuntime';

export const metadata: Metadata = {
  title: 'FixIt Maldives',
  description: 'Local service requests matched with trusted providers in Maldives.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'FixIt',
  },
  formatDetection: { telephone: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f5f5f7',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <ThemeRuntime/>
        <ResponsiveRuntime/>
        <CompactCopyRuntime/>
        <ButtonUsabilityRuntime/>
        <MobileSectionPager/>
        <MobileKeyboardRuntime/>
        <WorkspaceThemeRuntime/>
        <ServerSessionSignOutSync/>
        <SendRequestTapRuntime/>
        <RequestWizardSmartRuntime/>
        <RoleAccessGuard/>
        <PreferredDateRuntime/>
        <GlobalRoleMenu/>
        <GlobalModeSwitch/>
        <TopWorkspaceRoleLabel/>
        <GlobalCardPagination/>
        <MobileDateInputRuntime/>
        <ApprovedCustomerHomeRuntime/>
        <ErrorRuntime/>

        <main id="main-content" className="globalMainWorkspace">
          {children}
        </main>

        <IOSWebAppShell/>
        <ModeToast/>
      </body>
    </html>
  );
}
