# coding: utf-8
import os
import re

directory = "frontend/components/bolt"
for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith(".tsx") or file.endswith(".ts"):
            path = os.path.join(root, file)
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
            
            original = content
            content = re.sub(r'NovaMart\s+[^\w\s]+\s*([a-zA-Z]+)', r'NovaMart - \1', content)
            
            # Remove any remaining non-ascii characters (like the weird degree symbol, the A with tilde, etc)
            # We keep it simple: replace non-ascii with a standard hyphen if it's surrounded by spaces
            content = re.sub(r' [^\x00-\x7F]+ ', ' - ', content)
            # Or just strip non-ascii completely if it's attached
            content = re.sub(r'[^\x00-\x7F]+', '', content)
            
            if content != original:
                with open(path, "w", encoding="utf-8") as f:
                    f.write(content)
                print(f"Cleaned {path}")
