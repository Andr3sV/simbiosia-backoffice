import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/Sidebar';
import { SidebarProvider } from '@/components/SidebarLayout';
import { LayoutWrapper } from '@/components/LayoutWrapper';

export const metadata: Metadata = {
  title: 'Simbiosia Backoffice',
  description: 'Monitor AI agent calls and costs from Twilio and ElevenLabs',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ backgroundColor: '#171717' }}>
        <SidebarProvider>
          <Sidebar />
          <LayoutWrapper>{children}</LayoutWrapper>
        </SidebarProvider>
      </body>
    </html>
  );
}
