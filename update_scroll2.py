import re

path = "frontend/components/bolt/HomeScreen.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Update import
content = content.replace(
    "import { ArrowRight } from 'lucide-react';",
    "import { ArrowRight, ArrowDown } from 'lucide-react';"
)

new_indicator = """
        {/* Elite Scroll Down Indicator */}
        <div 
          className="fixed bottom-12 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-3 pointer-events-none transition-all duration-700"
          style={{ opacity: scrollProgress < 0.1 ? 1 : 0, transform: scrollProgress < 0.1 ? 'translateY(0)' : 'translateY(20px)' }}
        >
          <div className="w-14 h-14 rounded-full bg-[#dfdcd1] shadow-sm flex items-center justify-center border border-ink-200/20">
            <motion.div
              animate={{ y: [0, 4, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            >
              <ArrowDown className="w-5 h-5 text-ink-600 stroke-[1.5]" />
            </motion.div>
          </div>
          <div className="text-lg font-serif text-ink-900 mix-blend-multiply">Scroll down</div>
        </div>
"""

# Replace old indicator
content = re.sub(
    r'\{\/\* Elite Scroll Down Indicator \*\/.*?<\/div>\s*<\/div>\s*<\/div>',
    new_indicator.strip(),
    content,
    flags=re.DOTALL
)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated scroll indicator")
