import re

path_data = "frontend/components/bolt/DataScreens.tsx"
with open(path_data, "r", encoding="utf-8") as f:
    content_data = f.read()

# Update SVG lines
svg_old = """<svg className="absolute inset-0 w-full h-full pointer-events-none">
                <line x1="50%" y1="15%" x2="50%" y2="50%" stroke="currentColor" strokeWidth="1.5" className="text-ink-300" />
                <line x1="50%" y1="50%" x2="85%" y2="50%" stroke="currentColor" strokeWidth="1.5" className="text-ink-300" />
                <line x1="50%" y1="50%" x2="15%" y2="50%" stroke="currentColor" strokeWidth="1.5" className="text-ink-300" />
                <line x1="50%" y1="50%" x2="50%" y2="85%" stroke="currentColor" strokeWidth="1.5" className="text-ink-300" />
                <line x1="50%" y1="15%" x2="15%" y2="50%" stroke="currentColor" strokeWidth="1.5" className="text-ink-300" />
              </svg>"""

svg_new = """<svg className="absolute inset-0 w-full h-full pointer-events-none">
                <line x1="50%" y1="25%" x2="50%" y2="50%" stroke="currentColor" strokeWidth="1.5" className="text-ink-300" />
                <line x1="50%" y1="50%" x2="75%" y2="50%" stroke="currentColor" strokeWidth="1.5" className="text-ink-300" />
                <line x1="50%" y1="50%" x2="25%" y2="50%" stroke="currentColor" strokeWidth="1.5" className="text-ink-300" />
                <line x1="50%" y1="50%" x2="50%" y2="75%" stroke="currentColor" strokeWidth="1.5" className="text-ink-300" />
                <line x1="50%" y1="25%" x2="25%" y2="50%" stroke="currentColor" strokeWidth="1.5" className="text-ink-300" />
              </svg>"""

content_data = content_data.replace(svg_old, svg_new)

# Update node styling and background
content_data = content_data.replace('className="border rule rounded-sm bg-parchment-50 p-8 mb-12"', 'className="border border-ink-200/50 rounded-sm bg-parchment-100 p-8 mb-12"')

old_node = """<div
                  key={entity.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 w-28 h-28 flex flex-col items-center justify-center bg-white border border-ink-200 rounded-full shadow-sm hover:shadow-[0_0_30px_rgba(180,140,50,0.2)] hover:border-brass-300 transition-all duration-500 cursor-pointer group hover:scale-105 z-10"
                  style={{ left: `${entity.x}%`, top: `${entity.y}%` }}
                >
                  <div className="absolute inset-0 rounded-full border border-brass-400/0 group-hover:border-brass-400/50 group-hover:animate-ping opacity-20" />
                    <div className="text-sm font-serif italic text-ink-800 capitalize transition-colors group-hover:text-brass-700">{entity.name}</div>
                </div>"""

new_node = """<div
                  key={entity.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 w-28 h-28 flex flex-col items-center justify-center bg-brass-700 rounded-full shadow-md hover:shadow-[0_0_20px_rgba(122,99,48,0.4)] transition-all duration-500 cursor-pointer group hover:scale-105 z-10"
                  style={{ left: `${entity.x}%`, top: `${entity.y}%` }}
                >
                  <div className="absolute inset-0 rounded-full border border-brass-400/0 group-hover:border-brass-400/50 group-hover:animate-ping opacity-20" />
                    <div className="text-sm font-sans font-medium text-parchment-50 capitalize transition-colors">{entity.name}</div>
                </div>"""

content_data = content_data.replace(old_node, new_node)

with open(path_data, "w", encoding="utf-8") as f:
    f.write(content_data)
print("Updated DataScreens.tsx")
