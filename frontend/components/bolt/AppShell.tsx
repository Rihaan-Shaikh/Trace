import { type View } from '@/lib/bolt/types';
import {
  Scale,
  Database,
  BookOpen,
  Sliders,
  Store,
  Settings,
} from 'lucide-react';

interface AppShellProps {
  currentView: View;
  onNavigate: (view: View) => void;
  children: React.ReactNode;
}

interface NavItem {
  id: View;
  label: string;
  icon: typeof Scale;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Decisions', icon: Scale },
  { id: 'data', label: 'Data', icon: Database },
  { id: 'ledger', label: 'Ledger', icon: BookOpen },
  { id: 'rate-card', label: 'Rate card', icon: Sliders },
];

export function AppShell({ currentView, onNavigate, children }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-parchment-100">
      {/* Left rail */}
      <nav className="fixed left-0 top-0 h-screen w-[76px] z-30 flex flex-col items-center border-r rule bg-parchment-50">
                  {/* Logo */}
          <div className="pt-6 pb-8 select-none cursor-pointer flex flex-col items-center" onClick={() => onNavigate('home')}>
            <div className="font-serif text-[18px] font-semibold text-ink-800 tracking-tight leading-none">
              TRACE
            </div>
            <div className="text-[7px] text-ink-400 tracking-widest mt-1 text-center uppercase leading-tight w-full px-1">
              Decision<br/>Underwriting
            </div>
            <div className="w-[1px] h-4 bg-vermilion-500 mt-3"></div>
          </div>

        {/* Nav items */}
        <div className="flex flex-col gap-1 flex-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = currentView === item.id ||
              (item.id === 'home' && (currentView === 'decision-brief' || currentView === 'sandbox' || currentView === 'approval' || currentView === 'decision-record' || currentView === 'investigation' || currentView === 'semantic-map' || currentView === 'data-health'));
            if (item.id === 'data' && (currentView === 'data' || currentView === 'semantic-map' || currentView === 'data-health')) {
              // data is active
            }
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`group relative flex flex-col items-center justify-center w-full h-14 rounded-none transition-colors focus-ring ${
                  active ? 'text-ink-800' : 'text-ink-400 hover:text-ink-600'
                }`}
                title={item.label}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 bg-vermilion-500 rounded-r-full" />
                )}
                <Icon className="w-[18px] h-[18px]" strokeWidth={1.5} />
                <span className="text-[9px] mt-1 font-medium tracking-wide">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Bottom */}
        <div className="pb-6 flex flex-col items-center gap-4">
          <button
            className="flex items-center justify-center w-10 h-10 rounded-md text-ink-400 hover:text-ink-600 hover:bg-parchment-100 transition-colors focus-ring"
            title="NovaMart"
          >
            <Store className="w-[18px] h-[18px]" strokeWidth={1.5} />
          </button>
          <button
            className="flex items-center justify-center w-10 h-10 rounded-md text-ink-400 hover:text-ink-600 hover:bg-parchment-100 transition-colors focus-ring"
            title="Settings"
          >
            <Settings className="w-[18px] h-[18px]" strokeWidth={1.5} />
          </button>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 ml-[76px] min-w-0">
        {children}
      </main>
    </div>
  );
}

