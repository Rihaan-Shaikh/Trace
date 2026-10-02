import re

path = "frontend/components/bolt/HomeScreen.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Add isStarting state
content = content.replace(
    'const [scrollProgress, setScrollProgress] = useState(0);',
    'const [scrollProgress, setScrollProgress] = useState(0);\n  const [isStarting, setIsStarting] = useState(false);'
)

# Update handleStart
content = content.replace(
    'const handleStart = () => {\n    if (decisionText.trim()) {\n      onNavigate(\'data\');\n    }\n  };',
    'const handleStart = () => {\n    if (decisionText.trim() && !isStarting) {\n      setIsStarting(true);\n      onNavigate(\'data\');\n      # We don\'t set it back to false because it will unmount anyway when onNavigate finishes\n    }\n  };'
)

# Fix python comment to JS comment in replacement
content = content.replace(
    '# We don\'t set it back to false',
    '// We don\'t set it back to false'
)

# Update button disabled state
content = content.replace(
    'disabled={!decisionText.trim()}',
    'disabled={!decisionText.trim() || isStarting}'
)

# Add animate-spin to icon if loading
content = content.replace(
    '<ArrowRight className="w-6 h-6 md:w-8 md:h-8 group-hover:translate-x-2 transition-transform" />',
    '{isStarting ? <div className="w-6 h-6 md:w-8 md:h-8 border-2 border-parchment-50 border-t-transparent rounded-full animate-spin" /> : <ArrowRight className="w-6 h-6 md:w-8 md:h-8 group-hover:translate-x-2 transition-transform" />}'
)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Added loading state to button")
