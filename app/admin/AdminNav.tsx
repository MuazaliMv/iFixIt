'use client';

import { usePathname } from 'next/navigation';

const adminLinks = [
  {label:'Service Categories',href:'/admin/service-categories'},
];

export default function AdminNav() {
  const path = usePathname() ?? '';
  return (
    <nav aria-label="Admin navigation">
      <ul>
        {adminLinks.map(link => (
          <li key={link.href}>
            <a
              href={link.href}
              aria-current={path.startsWith('/admin/service-categories') && link.href === '/admin/service-categories' ? 'page' : undefined}
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
