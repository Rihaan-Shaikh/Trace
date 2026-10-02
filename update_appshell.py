import re

path_app = "frontend/components/bolt/App.tsx"
with open(path_app, "r", encoding="utf-8") as f:
    app_content = f.read()

app_content = app_content.replace(
    '<AppShell currentView={view} onNavigate={handleNavigate}>',
    '<AppShell currentView={view} onNavigate={handleNavigate} hasText={decisionText.trim().length > 0}>'
)
with open(path_app, "w", encoding="utf-8") as f:
    f.write(app_content)


path_shell = "frontend/components/bolt/AppShell.tsx"
with open(path_shell, "r", encoding="utf-8") as f:
    shell_content = f.read()

shell_content = shell_content.replace(
    'interface AppShellProps {\n  currentView: View;\n  onNavigate: (view: View) => void;\n  children: React.ReactNode;\n}',
    'interface AppShellProps {\n  currentView: View;\n  onNavigate: (view: View) => void;\n  children: React.ReactNode;\n  hasText?: boolean;\n}'
)
shell_content = shell_content.replace(
    'export function AppShell({ currentView, onNavigate, children }: AppShellProps) {',
    'export function AppShell({ currentView, onNavigate, children, hasText }: AppShellProps) {'
)

# Find the dock navigation and hide it conditionally
shell_content = shell_content.replace(
    '<div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">',
    '<div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ${currentView === \'home\' && !hasText ? \'opacity-0 pointer-events-none translate-y-8\' : \'opacity-100 translate-y-0\'}`}>'
)

with open(path_shell, "w", encoding="utf-8") as f:
    f.write(shell_content)
print("Updated AppShell")
