import { type View } from '@/lib/bolt/types';

interface AppShellProps {
  currentView: View;
  onNavigate: (view: View) => void;
  children: React.ReactNode;
}

interface NavItem {
  id: View;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Start' },
  { id: 'data', label: 'Evidence Map' },
  { id: 'investigation', label: 'Dossier' },
  { id: 'ledger', label: 'Ledger' },
  { id: 'rate-card', label: 'Rate Card' },
];

export function AppShell({ currentView, onNavigate, children }: AppShellProps) {
  return (
    <div className="flex flex-col min-h-screen bg-parchment-100 selection:bg-vermilion-500/20">
      
      {/* Top Header - Ultra minimal */}
      <header className="fixed top-0 left-0 w-full z-40 p-6 flex justify-between items-center mix-blend-difference text-parchment-100 pointer-events-none">
        <div className="font-serif text-3xl cursor-pointer pointer-events-auto" onClick={() => onNavigate('home')}>
          TRACE
        </div>
        <div className="flex gap-8 text-[10px] tracking-[0.2em] uppercase font-mono font-medium">
          <span>RK / NovaMart</span>
          <span className="opacity-50">v2.0</span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 w-full pb-32">
        {children}
      </main>

      {/* Floating Pill Dock Navigation */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <nav className="flex items-center gap-1 p-1.5 bg-ink-900 rounded-full shadow-2xl backdrop-blur-md">
          {NAV_ITEMS.map((item) => {
            const active = currentView === item.id || 
              (item.id === 'home' && ['decision-brief', 'sandbox', 'approval', 'decision-record'].includes(currentView)) ||
              (item.id === 'data' && ['data-health', 'semantic-map'].includes(currentView));
              
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`px-6 py-2.5 rounded-full text-[11px] uppercase tracking-widest font-medium transition-all duration-300 ${
                  active 
                    ? 'bg-parchment-100 text-ink-900 shadow-md' 
                    : 'text-parchment-50 hover:text-white hover:bg-ink-800'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
