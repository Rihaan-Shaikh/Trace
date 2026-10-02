import os
import re

directory = "frontend/components/bolt"
for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith(".tsx") or file.endswith(".ts"):
            path = os.path.join(root, file)
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            
            orig = content
            
            # Remove console.warn and console.error
            content = re.sub(r'\s*console\.warn\([^\)]+\);', '', content)
            content = re.sub(r'\s*console\.error\([^\)]+\);', '', content)
            
            # Specifically handle `.catch(console.warn)`
            content = content.replace('.catch(console.warn)', '.catch(() => {})')
            content = content.replace('.catch(console.error)', '.catch(() => {})')
            
            if content != orig:
                with open(path, "w", encoding="utf-8") as f:
                    f.write(content)
                print(f"Removed logs in {path}")
