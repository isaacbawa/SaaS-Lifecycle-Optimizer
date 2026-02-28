import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { ChunkLoadErrorRecovery } from '@/components/chunk-load-error-recovery';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'LifecycleOS — SaaS Lifecycle Infrastructure & Email Marketing',
  description:
    'Increase activation, reduce churn, and expand recurring revenue with behavior-driven email marketing powered by real product data.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      afterSignOutUrl="/"
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
    >
      <html lang="en" suppressHydrationWarning>
        <body className={`${inter.variable} font-body antialiased`}>
          <ChunkLoadErrorRecovery />
          {children}
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}
