import os
import re

TRACE_SPAN = '<span className="font-serif italic font-medium lowercase tracking-wider text-ink-500">trace</span>'

directory = "frontend/components/bolt"
skip_files = ['AppShell.tsx', 'HomeScreen.tsx', 'icon.svg']

for root, _, files in os.walk(directory):
    for file in files:
        if file in skip_files or not file.endswith(".tsx"):
            continue
            
        path = os.path.join(root, file)
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        
        orig = content
        
        content = re.sub(r'(?<=\s)TRACE(?=\s)', TRACE_SPAN, content)
        content = re.sub(r'(?<=\s)TRACE(?=[.,])', TRACE_SPAN, content)
        content = re.sub(r'^TRACE(?=\s)', TRACE_SPAN, content)
        content = re.sub(r'TRACES', TRACE_SPAN + 's', content)
        
        if content != orig:
            with open(path, "w", encoding="utf-8") as f:
                f.write(content)
            print(f"Updated {path}")
