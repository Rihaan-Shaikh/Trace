import { type View } from '@/lib/bolt/types';

interface AppShellProps {
  currentView: View;
  onNavigate: (view: View) => void;
  children: React.ReactNode;
}

interface NavItem {
  id: View;
  num: string;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', num: '01', label: 'DECISIONS' },
  { id: 'data', num: '02', label: 'EVIDENCE' },
  { id: 'ledger', num: '03', label: 'LEDGER' },
  { id: 'rate-card', num: '04', label: 'RATE CARD' },
];

export function AppShell({ currentView, onNavigate, children }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-base-900 text-ink-50">
      {/* Architectural Left Rail */}
      <nav className="fixed left-0 top-0 h-screen w-48 z-30 flex flex-col justify-between border-r border-base-600 bg-base-900">
        
        <div>
          {/* Logo */}
          <div className="p-8 select-none cursor-pointer" onClick={() => onNavigate('home')}>
            <div className="font-mono text-xl tracking-[0.2em] font-medium text-ink-50 mb-1">
              T R A C E
            </div>
            <div className="text-[9px] tracking-[0.2em] uppercase text-ink-300">
              Decision Underwriting
            </div>
          </div>

          {/* Nav items */}
          <div className="flex flex-col mt-8">
            {NAV_ITEMS.map((item) => {
              const active = currentView === item.id || 
                (item.id === 'home' && ['decision-brief', 'sandbox', 'approval', 'decision-record', 'investigation'].includes(currentView)) ||
                (item.id === 'data' && ['data-health', 'semantic-map'].includes(currentView));
                
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`group relative flex items-start px-8 py-4 transition-colors ${
                    active ? 'text-ink-50' : 'text-ink-400 hover:text-ink-100'
                  }`}
                >
                  {active && (
                    <span className="absolute left-8 top-10 w-2 h-[1px] bg-vermilion-500" />
                  )}
                  <div className="flex flex-col items-start pl-4">
                    <span className="font-mono text-xs opacity-50 mb-1">{item.num}</span>
                    <span className="text-[10px] tracking-[0.15em] font-medium">{item.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Metadata */}
        <div className="p-8 text-[10px] tracking-widest text-ink-400 uppercase border-t border-base-600">
          <div className="mb-1 text-ink-50">RK</div>
          <div>NovaMart</div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 ml-48">
        {children}
      </main>
    </div>
  );
}
