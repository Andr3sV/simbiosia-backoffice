'use client';

import { useSidebar } from './SidebarLayout';
import { cn } from '@/lib/utils';

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();

  return (
    <div
      className={cn(
        'flex flex-col flex-1 transition-all duration-300',
        isCollapsed ? 'md:ml-20' : 'md:ml-64'
      )}
    >
      <main className="flex-1 pt-16 md:pt-0">{children}</main>
    </div>
  );
}
