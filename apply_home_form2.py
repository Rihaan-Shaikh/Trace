import re
with open("frontend/components/bolt/HomeScreen.tsx", "r", encoding="utf-8") as f:
    content = f.read()

old_form = r'<div className="flex flex-col space-y-6">[\s\S]*?</div>\s*</div>\s*</div>'

new_form = """<div className="flex flex-col">
              <h2 className="font-serif text-3xl md:text-5xl text-ink-900 mb-8 leading-[1.1] tracking-tight">
                What are you willing to be wrong about?
              </h2>
              <div className="relative group w-full">
                <textarea
                  value={decisionText}
                  onChange={(e) => onSetDecision(e.target.value)}
                  placeholder="E.g., Stop blanket discounts for low-margin customers"
                  className="w-full bg-transparent border-b border-ink-300 py-4 text-xl md:text-2xl font-serif text-ink-900 placeholder:text-ink-300 placeholder:italic resize-none focus:outline-none focus:border-ink-900 transition-colors"
                  rows={2}
                />
              </div>
              <div className="mt-12 flex justify-start">
                <button
                  onClick={handleStart}
                  disabled={!decisionText.trim()}
                  className="group flex items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-full bg-ink-900 text-parchment-50 disabled:bg-ink-200 disabled:text-ink-400 hover:scale-[1.02] transition-all duration-500 shadow-xl"
                >
                  <ArrowRight className="w-6 h-6 md:w-8 md:h-8 group-hover:translate-x-2 transition-transform" />
                </button>
              </div>
            </div>"""

content = re.sub(old_form, new_form, content)

with open("frontend/components/bolt/HomeScreen.tsx", "w", encoding="utf-8") as f:
    f.write(content)
