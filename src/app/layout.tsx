import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { FileSystemProvider } from '@/context/FileSystemContext';
import { LogProvider } from '@/context/LogContext';

export const metadata: Metadata = {
  title: 'CodePilot App',
  description: 'AI-powered code assistant',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <FileSystemProvider>
          <LogProvider>
            {children}
            <Toaster />
          </LogProvider>
        </FileSystemProvider>
      </body>
    </html>
  );
}
