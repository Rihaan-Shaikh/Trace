import re
with open("frontend/components/bolt/HomeScreen.tsx", "r", encoding="utf-8") as f:
    content = f.read()

old_form = r'<div \s*className="relative z-50 w-full max-w-2xl px-6 pointer-events-auto"[\s\S]*?</button>\s*</div>\s*</div>\s*</div>'

new_form = """<div 
          className="relative z-50 w-full max-w-[90vw] lg:max-w-[75vw] px-6 pointer-events-auto mx-auto"
          style={{ 
            opacity: opacityTextForm,
            transform: `translateY(${(1 - opacityTextForm) * 30}px)`
          }}
        >
          <div className="flex flex-col space-y-6">
              <input
                type="text"
                autoFocus
                className="w-full bg-transparent border-none text-4xl sm:text-6xl md:text-8xl font-serif text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-0 leading-[1.1] tracking-tight"
                placeholder="e.g. Stop blanket discounts for low-margin customers."
                value={decisionText}
                onChange={(e) => onSetDecision(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleStart();
                }}
              />
              <div className="flex items-center justify-between mt-12">
                <div className="text-sm font-mono tracking-widest text-ink-400 uppercase">
                  ENTER TO TRACE
                </div>
                <div className="flex items-center gap-6">
                  <button 
                    onClick={handleStart}
                    disabled={!decisionText.trim()}
                    className="group flex items-center justify-center w-24 h-24 rounded-full bg-ink-900 text-parchment-50 disabled:bg-ink-200 disabled:text-ink-400 hover:scale-[1.02] transition-all duration-500 shadow-xl"
                  >
                    <ArrowRight className="w-8 h-8 group-hover:translate-x-2 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
        </div>"""

content = re.sub(old_form, new_form, content)

with open("frontend/components/bolt/HomeScreen.tsx", "w", encoding="utf-8") as f:
    f.write(content)
