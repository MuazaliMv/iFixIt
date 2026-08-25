import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FixIt Maldives',
    short_name: 'FixIt',
    description: 'Local service requests matched with trusted providers in Maldives.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f5f5f7',
    theme_color: '#f5f5f7',
    orientation: 'portrait-primary',
    categories: ['utilities','productivity'],
  };
}
