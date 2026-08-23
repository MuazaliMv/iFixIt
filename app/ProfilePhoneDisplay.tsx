'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

function syncPhoneIntoHero() {
  const hero = document.querySelector<HTMLElement>('.accountApp .profileIdentityCopy');
  if (!hero) return;

  const detailRows = Array.from(document.querySelectorAll<HTMLElement>('.accountApp .profileDetailRow'));
  const phoneRow = detailRows.find((row) => row.querySelector('span')?.textContent?.trim() === 'Phone');
  const phone = phoneRow?.querySelector('strong')?.textContent?.trim() || '';

  let line = hero.querySelector<HTMLElement>('[data-profile-phone-line="true"]');
  if (!line) {
    line = document.createElement('p');
    line.dataset.profilePhoneLine = 'true';
    line.className = 'profilePhoneLine';
    const emailLine = hero.querySelector('p');
    if (emailLine?.nextSibling) hero.insertBefore(line, emailLine.nextSibling);
    else hero.appendChild(line);
  }

  line.textContent = phone && phone !== 'Not provided' ? `Phone: ${phone}` : 'Phone: Not provided';
}

export default function ProfilePhoneDisplay() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || !pathname.includes('/profile')) return;

    syncPhoneIntoHero();
    const observer = new MutationObserver(() => syncPhoneIntoHero());
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
