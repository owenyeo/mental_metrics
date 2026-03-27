import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Youth Support Demo',
  description: 'Mindline-inspired demo service integrating the Service Intelligence Layer SDK',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
