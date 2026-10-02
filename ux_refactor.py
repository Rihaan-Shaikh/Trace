import os
import re

TRACE_SPAN = '<span className="font-serif italic text-ink-500 lowercase tracking-wider">trace</span>'

replacements = {
    'className="px-4 py-2 bg-ink-900 text-parchment-50 hover:bg-ink-800 transition-colors rounded-sm flex items-center gap-2"':
    'className="px-6 py-2.5 bg-ink-900 text-parchment-50 hover:bg-ink-800 transition-all duration-300 rounded-full flex items-center gap-2 shadow-[0_2px_15px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.15)]"',
    
    'className="px-4 py-2 bg-ink-100 text-ink-900 hover:bg-ink-200 transition-colors rounded-sm flex items-center gap-2"':
    'className="px-6 py-2.5 bg-ink-100/50 text-ink-900 hover:bg-ink-200/80 transition-all duration-300 rounded-full flex items-center gap-2 backdrop-blur-sm border border-ink-200/50"',
    
    'className="px-4 py-2 bg-vermilion-600 text-parchment-50 hover:bg-vermilion-700 transition-colors rounded-sm"':
    'className="px-6 py-2.5 bg-vermilion-600 text-parchment-50 hover:bg-vermilion-700 transition-all duration-300 rounded-full shadow-[0_2px_15px_rgba(200,60,40,0.2)] hover:shadow-[0_4px_20px_rgba(200,60,40,0.3)]"',

    '<div className="text-xs text-ink-400 font-medium mb-2">Loss history</div>':
    '',
    
    'Map semantic entities': 'Synthesize Actuarial DNA',
    'Ingested & Reconciled Tables': 'Assembled Evidence',
    'Live Benchmark Tables Connected': 'Verified Corpus Active',
    'The semantic graph.': 'The anatomy of the decision.',
    'System Health': 'Actuarial Integrity',
    'Data health': 'Integrity check',
    'Loss history': 'Historical Precedent',
}

def process_file(path):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    
    orig = content
    for old, new in replacements.items():
        content = content.replace(old, new)
        
    content = content.replace(
        'The pricing logic, shown openly. No hidden AI magic. No model confidence. The Decision Premium is a transparent deterministic function of four risk drivers.',
        'Actuarial calculus, exposed. No black-box inference, just deterministic synthesis across four principal risk drivers.'
    )
    
    content = re.sub(
        r'className="([^"]*)text-center([^"]*)text-balance([^"]*)"',
        r'className="\1\2\3"',
        content
    )
    content = re.sub(
        r'className="([^"]*)text-balance([^"]*)"',
        r'className="\1\2"',
        content
    )
    
    if content != orig:
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Updated {path}")

directory = "frontend/components/bolt"
for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith(".tsx"):
            process_file(os.path.join(root, file))
