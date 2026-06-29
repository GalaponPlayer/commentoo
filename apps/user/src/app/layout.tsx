import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Commentoo',
  description: 'Interactive live comment system for presentations',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Participant app is dark-first (Commentoo Design System).
  return (
    <html lang="ja" className="dark">
      <body className="bg-background text-foreground">{children}</body>
    </html>
  );
}
