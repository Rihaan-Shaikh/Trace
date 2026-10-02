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
            
            # Remove the text div from loaders
            content = re.sub(
                r'<div className="mt-8 text-sm font-serif italic text-ink-500 tracking-widest uppercase">[^<]*</div>',
                '',
                content
            )
            
            if content != orig:
                with open(path, "w", encoding="utf-8") as f:
                    f.write(content)
                print(f"Removed loader text from {path}")
