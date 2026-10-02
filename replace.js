const fs = require('fs');
const content = fs.readFileSync('frontend/components/bolt/DataScreens.tsx', 'utf8');

const regex = /<div className="relative h-64 w-full">[\s\S]*?\{SEMANTIC_ENTITIES\.map\(\(entity\) => \([\s\S]*?<\/div>\s*\}\)\}\s*<\/div>/;

const newGraph = \<div className="relative h-[400px] w-full">
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {SEMANTIC_ENTITIES.map(source => 
                source.connectedTo.map(targetId => {
                  const target = SEMANTIC_ENTITIES.find(e => e.id === targetId);
                  if (!target) return null;
                  return (
                    <line 
                      key={\\-\\}
                      x1={\\%\} y1={\\%\}
                      x2={\\%\} y2={\\%\}
                      stroke="var(--ink-300)" strokeWidth="1.5" strokeDasharray="4 4"
                    />
                  );
                })
              )}
            </svg>

            {SEMANTIC_ENTITIES.map((entity) => (
              <div
                key={entity.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 w-28 h-28 bg-parchment-100 border border-ink-300 rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform cursor-default"
                style={{ left: \\%\, top: \\%\ }}
              >
                <div className="text-[10px] font-mono text-ink-700 uppercase tracking-widest font-semibold text-center">{entity.name}</div>
              </div>
            ))}
          </div>\;

const newContent = content.replace(regex, newGraph);
fs.writeFileSync('frontend/components/bolt/DataScreens.tsx', newContent);
