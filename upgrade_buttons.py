import os
import re

directory = "frontend/components/bolt"
for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith(".tsx"):
            path = os.path.join(root, file)
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            
            orig = content
            
            content = re.sub(
                r'className="([^"]*)bg-ink-800 text-parchment-50([^"]*)rounded-sm([^"]*)"',
                r'className="\1bg-ink-900 text-parchment-50\2rounded-full shadow-[0_2px_15px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.15)] transition-all duration-300\3"',
                content
            )
            content = re.sub(
                r'className="([^"]*)bg-ink-900 text-parchment-50([^"]*)rounded-sm([^"]*)"',
                r'className="\1bg-ink-900 text-parchment-50\2rounded-full shadow-[0_2px_15px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.15)] transition-all duration-300\3"',
                content
            )
            
            if content != orig:
                with open(path, "w", encoding="utf-8") as f:
                    f.write(content)
                print(f"Upgraded buttons in {path}")
