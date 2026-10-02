import re

path = "frontend/components/bolt/InvestigationScreen.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

loader = """          {/* Ongoing API loading bar */}
          {visibleCount >= INVESTIGATION_STAGES.length && isInvestigating && (
            <div className="mt-8 pt-4 w-full max-w-lg animate-in fade-in duration-1000">
              <div className="h-0.5 w-full bg-ink-200/50 overflow-hidden rounded-full relative">
                <div 
                  className="absolute top-0 left-0 h-full bg-brass-500 rounded-full w-1/2"
                  style={{ animation: 'loading-bar 1.5s infinite ease-in-out' }}
                />
              </div>
              <style>{`
                @keyframes loading-bar {
                  0% { transform: translateX(-100%); }
                  100% { transform: translateX(200%); }
                }
              `}</style>
            </div>
          )}

        </div>
      </div>
    </div>"""

content = content.replace("        </div>\n      </div>\n    </div>", loader)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Added loading bar")
