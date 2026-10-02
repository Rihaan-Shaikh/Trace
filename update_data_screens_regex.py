import re

path_data = "frontend/components/bolt/DataScreens.tsx"
with open(path_data, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Remove border and bg
content = re.sub(
    r'<div className="border [^"]+ p-8 mb-12">',
    '<div className="mb-12">',
    content
)

# 2. Remove "Inferred entity graph" text
content = re.sub(
    r'<div className="text-xs text-ink-400 font-medium mb-6">Inferred entity graph</div>',
    '',
    content
)

# 3. Update the SVG
svg_old = r"""<svg className="absolute inset-0 w-full h-full pointer-events-none">
              <line x1="50%" y1="15%" x2="50%" y2="50%" stroke="currentColor" strokeWidth="1.5" className="text-ink-300" />
              <line x1="50%" y1="50%" x2="85%" y2="50%" stroke="currentColor" strokeWidth="1.5" className="text-ink-300" />
              <line x1="50%" y1="50%" x2="15%" y2="50%" stroke="currentColor" strokeWidth="1.5" className="text-ink-300" />
              <line x1="50%" y1="50%" x2="50%" y2="85%" stroke="currentColor" strokeWidth="1.5" className="text-ink-300" />
              <line x1="50%" y1="15%" x2="15%" y2="50%" stroke="currentColor" strokeWidth="1.5" className="text-ink-300" />
            </svg>"""
# Wait, let's just use regex to replace all lines
content = re.sub(r'<line x1="50%" y1="15%" x2="50%" y2="50%"', '<line x1="50%" y1="25%" x2="50%" y2="50%"', content)
content = re.sub(r'<line x1="50%" y1="50%" x2="85%" y2="50%"', '<line x1="50%" y1="50%" x2="75%" y2="50%"', content)
content = re.sub(r'<line x1="50%" y1="50%" x2="15%" y2="50%"', '<line x1="50%" y1="50%" x2="25%" y2="50%"', content)
content = re.sub(r'<line x1="50%" y1="50%" x2="50%" y2="85%"', '<line x1="50%" y1="50%" x2="50%" y2="75%"', content)
content = re.sub(r'<line x1="50%" y1="15%" x2="15%" y2="50%"', '<line x1="50%" y1="25%" x2="25%" y2="50%"', content)


# 4. Update the nodes
content = re.sub(
    r'bg-white border border-ink-200 rounded-full shadow-sm hover:shadow-\[0_0_30px_rgba\(180,140,50,0\.2\)\] hover:border-brass-300',
    'bg-brass-700 border-none rounded-full shadow-md hover:shadow-[0_0_20px_rgba(122,99,48,0.4)]',
    content
)

content = re.sub(
    r'text-sm font-serif italic text-ink-800 capitalize transition-colors group-hover:text-brass-700',
    'text-sm font-sans font-medium text-parchment-50 capitalize transition-colors',
    content
)

with open(path_data, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated DataScreens.tsx with regex")
