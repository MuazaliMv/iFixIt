'use client';

import { useEffect } from 'react';

const UI_SELECTOR = [
  'button',
  'a[role="button"]',
  'nav a',
  'label > span',
  '.statusNotice',
  '.statusMessage',
  '.formMessage',
  '.fieldHelp',
  '.fieldError',
  '.capsWarning',
  '.emptyState',
  '.authIntro p',
  '.authStatusPill',
  '.authFootnote',
  '.sectionHeading p',
  '.requestAppHeading p',
  '.progressCard h3',
  '.progressStep strong',
  '.progressStep small',
].join(',');

const EXACT: Record<string, string> = {
  'Request is up to date.': 'Up to date.',
  'Request updated successfully.': 'Updated.',
  'Please wait…': 'Working…',
  'Refreshing…': 'Refreshing…',
  'Service Report': 'Report',
  'Request Progress': 'Progress',
  'Request Sent': 'Sent',
  'Provider Selected': 'Provider',
  'Estimate Approved': 'Estimate',
  'Work Completed': 'Completed',
  'Create your account': 'Create account',
  'Sign in to continue to iFixMV.': 'Sign in to continue.',
  'New iFixMV account': 'New account',
  'Secure account access': 'Secure sign-in',
  'Checking your secure session.': 'Checking session…',
  'Opening iFixMV…': 'Opening…',
  'Account created. You can now sign in.': 'Account created. Sign in.',
  'Choose at least one preferred inspection time.': 'Choose an inspection time.',
  'Please describe the problem.': 'Describe the problem.',
  'Choose 1–5 stars for Quality, Time, and Cost.': 'Rate Quality, Time, and Cost.',
  'Complete the required profile fields first.': 'Complete your profile first.',
  'Switch to Customer mode to create a request.': 'Switch to Customer first.',
  'Choose the service island or city.': 'Choose an island or city.',
  'Tell us a little more about the problem.': 'Describe the problem.',
  'Request types are currently unavailable.': 'Request types unavailable.',
  'Choose an available request type.': 'Choose a request type.',
  'Choose a preferred date.': 'Choose a date.',
  'Enter the on-site contact name.': 'Enter contact name.',
  'Enter the on-site contact phone number.': 'Enter contact phone.',
  'Draft saved on this device.': 'Draft saved.',
  'No messages yet.': 'No messages.',
  'No services found matching your search.': 'No services found.',
  '7-digit Maldives number': '7-digit number',
  'Password must be at least 8 characters.': 'Use at least 8 characters.',
  'Enter a valid email address.': 'Enter a valid email.',
  'Enter your email address.': 'Enter your email.',
  'Enter your full name.': 'Enter your name.',
  'Enter a valid 7-digit Maldives number.': 'Enter a valid 7-digit number.',
  'Secure sign-in · Role-based portal access': 'Secure · Role-based access',
  'Forgot password?': 'Forgot password?',
  'Create Account': 'Create Account',
};

function compactText(value: string) {
  const text = value.trim();
  if (!text) return value;
  if (EXACT[text]) return EXACT[text];
  if (/^Unable to\s+/i.test(text)) return text.replace(/^Unable to\s+/i, 'Couldn’t ');
  if (/^Please\s+/i.test(text) && text.length > 34) return text.replace(/^Please\s+/i, '');
  if (/ successfully\.$/i.test(text) && text.length > 28) return text.replace(/ successfully\.$/i, '.');
  return value;
}

function applyElement(element: HTMLElement) {
  if (!element.matches(UI_SELECTOR)) return;
  if (element.closest('.chatBubble, [data-user-content="true"], [contenteditable="true"]')) return;
  if (element.children.length > 0 && !element.matches('.statusNotice, .statusMessage, .formMessage, .emptyState, .authStatusPill, .authFootnote')) return;
  const current = element.textContent || '';
  const next = compactText(current);
  if (next !== current) {
    element.textContent = next;
    element.dataset.compactCopy = 'true';
  }
}

function applyCompactCopy(root: ParentNode = document) {
  if (root instanceof HTMLElement) applyElement(root);
  root.querySelectorAll<HTMLElement>(UI_SELECTOR).forEach(applyElement);
}

export default function CompactCopyRuntime() {
  useEffect(() => {
    applyCompactCopy();
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) applyCompactCopy(node);
            else if (node.parentElement) applyElement(node.parentElement);
          });
        } else if (mutation.type === 'characterData') {
          const parent = mutation.target.parentElement;
          if (parent) applyElement(parent);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
