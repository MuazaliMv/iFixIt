'use client';

import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  {label:'Service Categories',href:'/admin/service-categories'},
];

export default function AdminNav() {
  const path = usePathname() ?? '';
  return (
    <nav className="adminNav">
      {NAV_ITEMS.map(item => (
        <a
          key={item.href}
          href={item.href}
          aria-current={path.startsWith('/admin/service-categories') ? 'page' : undefined}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
