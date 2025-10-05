'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageSquare, Menu, Phone, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { useSidebar } from './SidebarLayout';

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Twilio', href: '/twilio', icon: Phone },
  { name: 'ElevenLabs', href: '/elevenlabs', icon: MessageSquare },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, setIsCollapsed } = useSidebar();

  return (
    <>
      {/* Desktop Sidebar */}
      <div
        className={cn(
          'hidden md:flex md:flex-col md:fixed md:inset-y-0 transition-all duration-300',
          isCollapsed ? 'md:w-20' : 'md:w-64'
        )}
      >
        <div
          className="flex flex-col flex-grow pt-5 overflow-y-auto"
          style={{ backgroundColor: '#282929' }}
        >
          <div className="flex items-center justify-between flex-shrink-0 px-4 mb-4">
            {!isCollapsed && (
              <h1 className="text-2xl font-bold text-white">
                Simbiosia <span style={{ color: '#b380fd' }}>BO</span>
              </h1>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={cn(
                'p-2 rounded-lg hover:bg-gray-700 transition-colors',
                isCollapsed && 'mx-auto'
              )}
            >
              {isCollapsed ? (
                <ChevronRight className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronLeft className="h-5 w-5 text-gray-400" />
              )}
            </button>
          </div>
          <Separator className="mb-4 bg-gray-700" />
          <nav className="flex-1 px-2 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  title={isCollapsed ? item.name : undefined}
                  className={cn(
                    'group flex items-center text-sm font-medium rounded-md transition-colors',
                    isCollapsed ? 'justify-center py-3 px-2' : 'px-3 py-2',
                    isActive ? 'text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  )}
                  style={isActive ? { backgroundColor: '#b380fd' } : {}}
                >
                  <item.icon
                    className={cn(
                      'h-5 w-5',
                      !isCollapsed && 'mr-3',
                      isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'
                    )}
                  />
                  {!isCollapsed && item.name}
                </Link>
              );
            })}
          </nav>
          {!isCollapsed && (
            <div className="flex-shrink-0 flex border-t border-gray-700 p-4">
              <div className="flex items-center">
                <div>
                  <p className="text-sm font-medium text-white">Backoffice</p>
                  <p className="text-xs font-medium text-gray-400">v1.0.0</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Sidebar */}
      <div className="md:hidden">
        <div
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3"
          style={{ backgroundColor: '#282929' }}
        >
          <h1 className="text-xl font-bold text-white">
            Simbiosia <span style={{ color: '#b380fd' }}>BO</span>
          </h1>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-64 text-white p-0"
              style={{ backgroundColor: '#282929' }}
            >
              <div className="flex flex-col h-full pt-5">
                <div className="flex items-center flex-shrink-0 px-4">
                  <h1 className="text-2xl font-bold text-white">
                    Simbiosia <span style={{ color: '#b380fd' }}>BO</span>
                  </h1>
                </div>
                <Separator className="my-4 bg-gray-700" />
                <nav className="flex-1 px-2 space-y-1">
                  {navigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        title={isCollapsed ? item.name : undefined}
                        className={cn(
                          'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                          isActive
                            ? 'text-white'
                            : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                          isCollapsed && 'justify-center'
                        )}
                        style={isActive ? { backgroundColor: '#b380fd' } : {}}
                      >
                        <item.icon
                          className={cn(
                            'h-5 w-5',
                            !isCollapsed && 'mr-3',
                            isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'
                          )}
                        />
                        {!isCollapsed && item.name}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </>
  );
}
