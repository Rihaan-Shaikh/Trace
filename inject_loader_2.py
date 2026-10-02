import re

path = "frontend/components/bolt/DataHealthScreen.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    'const [isLive, setIsLive] = useState(false);',
    'const [isLive, setIsLive] = useState(false);\n  const [isLoading, setIsLoading] = useState(true);'
)
content = content.replace(
    '} catch (err) {\n        console.error(\'Failed to load health:\', err);\n      }',
    '} catch (err) {\n        console.error(\'Failed to load health:\', err);\n      } finally {\n        if (isMounted) setIsLoading(false);\n      }'
)
content = content.replace(
    'if (!datasetId) return;',
    'if (!datasetId) { setIsLoading(false); return; }'
)

loading_ui = """
  if (isLoading) {
    return (
      <div className="min-h-screen bg-parchment-100 flex flex-col items-center justify-center">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 border-2 border-ink-200 border-t-ink-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 border-2 border-brass-200 border-b-brass-600 rounded-full animate-[spin_1.5s_linear_infinite_reverse]"></div>
        </div>
        <div className="mt-8 text-sm font-serif italic text-ink-500 tracking-widest uppercase">Validating Corpus Integrity...</div>
      </div>
    );
  }
"""

content = re.sub(
    r'(return \(\s*<div className="min-h-screen)',
    loading_ui + r'\1',
    content
)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Injected into DataHealthScreen")
