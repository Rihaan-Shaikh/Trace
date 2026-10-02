import re
with open("frontend/components/bolt/DataScreens.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Change the node divs to circles
old_node = r'className="absolute transform -translate-x-1/2 -translate-y-1/2 px-4 py-2 bg-parchment-100 border rule rounded-sm shadow-sm"'
new_node = 'className="absolute transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 flex items-center justify-center bg-white border border-ink-200 rounded-full shadow-[0_2px_12px_rgba(0,0,0,0.04)]"'
content = content.replace(old_node, new_node)

# Change the node text
old_text = r'className="text-xs font-mono text-ink-400 uppercase tracking-wider"'
new_text = 'className="text-base font-serif italic text-ink-800 capitalize"'
content = content.replace(old_text, new_text)

# Change the lines to solid and a bit darker
content = content.replace('strokeDasharray="4 4"', '')
content = content.replace('stroke="var(--ink-200)" strokeWidth="1"', 'stroke="var(--ink-300)" strokeWidth="1.5"')

with open("frontend/components/bolt/DataScreens.tsx", "w", encoding="utf-8") as f:
    f.write(content)
