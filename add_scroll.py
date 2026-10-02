import re

path = "frontend/components/bolt/HomeScreen.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Make sure motion is imported
if "from 'framer-motion'" not in content:
    content = content.replace(
        "import { ArrowRight } from 'lucide-react';",
        "import { ArrowRight } from 'lucide-react';\nimport { motion } from 'framer-motion';"
    )

scroll_indicator = """
        {/* Elite Scroll Down Indicator */}
        <div 
          className="fixed bottom-12 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-4 pointer-events-none transition-all duration-700"
          style={{ opacity: scrollProgress < 0.1 ? 1 : 0, transform: scrollProgress < 0.1 ? 'translateY(0)' : 'translateY(20px)' }}
        >
          <div className="text-[9px] uppercase tracking-[0.4em] text-ink-400 font-semibold font-sans mix-blend-multiply">Scroll to enter</div>
          <div className="w-5 h-9 border-[1.5px] border-ink-300/70 rounded-full flex justify-center p-1 relative shadow-[inset_0_2px_4px_rgba(0,0,0,0.05),_0_4px_12px_rgba(0,0,0,0.05)] bg-parchment-50/40 backdrop-blur-md">
            <motion.div 
              className="w-1 h-2.5 bg-ink-600 rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.2)]"
              animate={{ y: [0, 14, 0], opacity: [1, 0.5, 1] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            />
          </div>
        </div>

        {/* Foreground Input Area
"""

content = content.replace(
    "{/* Foreground Input Area",
    scroll_indicator
)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Added scroll indicator")
