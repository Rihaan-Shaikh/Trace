import React from 'react';
import type { Metadata } from 'next';
import { Inter, DM_Serif_Display, JetBrains_Mono } from 'next/font/google';
import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const dmSerif = DM_Serif_Display({ weight: '400', subsets: ['latin'], variable: '--font-serif' });
const jbMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'Trace • Not confidence. Coverage.',
  description: 'Not confidence. Coverage.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable + ' ' + dmSerif.variable + ' ' + jbMono.variable}>
      <body className="font-sans antialiased bg-parchment-100">{children}</body>
    </html>
  );
}


