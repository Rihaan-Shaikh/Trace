import re

with open('frontend/components/bolt/DataHealthScreen.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_map = r'\{liveFindings\.map\(\(finding\) => \([\s\S]*?\}\)\}'

new_map = """{isLoading ? (
            <div className="py-24 flex flex-col items-center justify-center text-ink-400 gap-4">
              <div className="w-6 h-6 border-2 border-ink-200 border-t-ink-600 rounded-full animate-spin" />
              <div className="text-sm font-mono tracking-widest uppercase">Analyzing Data Health...</div>
            </div>
          ) : liveFindings.map((finding) => (
            <div key={finding.id}>
              <div
                className="py-8 cursor-pointer group"
                onClick={() => handleFindingClick(finding.id)}
              >
                <div className="grid grid-cols-[140px_1fr_auto] gap-6 items-start">
                  {/* Number */}
                  <div className="editorial-num text-3xl text-vermilion-600 tabular-nums">
                    {finding.value}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="text-sm text-ink-400 mb-1">{finding.metric}</div>
                    <div className="text-base text-ink-700 leading-relaxed mb-2">
                      {finding.description}
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                      <span className="text-ink-500">
                        <span className="text-ink-400 mr-1">TRACE treatment:</span>
                        {finding.action}
                      </span>
                      <span className="text-brass-700 font-medium">
                        {finding.impact}
                      </span>
                    </div>
                  </div>

                  {/* Chevron */}
                  <div className="pt-2">
                    <ChevronRight className="w-4 h-4 text-ink-300 group-hover:text-ink-600 transition-colors" />
                  </div>
                </div>
              </div>
            </div>
          ))}"""

content = re.sub(old_map, new_map, content)

with open('frontend/components/bolt/DataHealthScreen.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
