import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Youth Support Demo Service',
  description: 'Demo service integrating the Service Intelligence Layer SDK',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
