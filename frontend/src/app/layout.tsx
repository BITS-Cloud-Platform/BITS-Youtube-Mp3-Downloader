import type { Metadata } from 'next';
import './globals.css';
import ToastProvider from '@/components/ToastProvider';

export const metadata: Metadata = {
  title: 'BITS YouTube Mp3 Downloader - Download YouTube Playlists to MP3',
  description:
    'Download YouTube playlists to MP3/M4A. Supports private and unlisted videos with cookie authentication. Fast, bulk YouTube to audio converter.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-black text-white">
        {children}
        <ToastProvider />
      </body>
    </html>
  );
}
