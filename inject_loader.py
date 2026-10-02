import re

path = "frontend/components/bolt/DecisionBrief.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

loading_ui = """
  if (isLoading) {
    return (
      <div className="min-h-screen bg-parchment-100 flex flex-col items-center justify-center">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 border-2 border-ink-200 border-t-ink-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 border-2 border-brass-200 border-b-brass-600 rounded-full animate-[spin_1.5s_linear_infinite_reverse]"></div>
        </div>
        <div className="mt-8 text-sm font-serif italic text-ink-500 tracking-widest uppercase">Loading Actuarial Matrix...</div>
      </div>
    );
  }
"""

content = re.sub(
    r'(// Active exposure summary cards.*?)(\s+return \()',
    r'\1\n' + loading_ui + r'\2',
    content,
    flags=re.DOTALL
)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Injected into DecisionBrief")
