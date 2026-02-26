import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Commentoo',
  description: 'Interactive live comment system for presentations',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
