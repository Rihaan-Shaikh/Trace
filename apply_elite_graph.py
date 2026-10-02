import re

with open("frontend/components/bolt/DataScreens.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Increase container height
content = content.replace('className="relative h-64 w-full"', 'className="relative h-96 w-full my-8"')

# 2. Upgrade the nodes with elite animations
old_node = 'className="absolute transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 flex items-center justify-center bg-white border border-ink-200 rounded-full shadow-[0_2px_12px_rgba(0,0,0,0.04)]"'
new_node = 'className="absolute transform -translate-x-1/2 -translate-y-1/2 w-28 h-28 flex flex-col items-center justify-center bg-white border border-ink-200 rounded-full shadow-sm hover:shadow-[0_0_30px_rgba(180,140,50,0.2)] hover:border-brass-300 transition-all duration-500 cursor-pointer group hover:scale-105 z-10"'
content = content.replace(old_node, new_node)

# 3. Add pulsing ring around the nodes
old_map = '          {SEMANTIC_ENTITIES.map((entity) => (\n                <div'
new_map = '          {SEMANTIC_ENTITIES.map((entity, i) => (\n                <div'

old_inner = '<div className="text-sm font-serif italic text-ink-800 capitalize">{entity.name}</div>'
new_inner = """<div className="absolute inset-0 rounded-full border border-brass-400/0 group-hover:border-brass-400/50 group-hover:animate-ping opacity-20" />
                  <div className="text-sm font-serif italic text-ink-800 capitalize transition-colors group-hover:text-brass-700">{entity.name}</div>"""

content = content.replace(old_map, new_map)
content = content.replace(old_inner, new_inner)

with open("frontend/components/bolt/DataScreens.tsx", "w", encoding="utf-8") as f:
    f.write(content)
