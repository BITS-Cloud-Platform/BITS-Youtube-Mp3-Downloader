import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BITS YouTube Downloader',
  description: 'Bulk YouTube to MP3 downloader',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-black text-white">{children}</body>
    </html>
  );
}