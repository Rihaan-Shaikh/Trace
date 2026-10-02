import os
import re

replacements = {
    r'NovaMart.*?evidence': 'NovaMart - evidentiary baseline',
    r'NovaMart.*?ontology': 'NovaMart - structural mapping',
    r'NovaMart.*?pricing decision': 'NovaMart - pricing decision',
    r'Decision brief.*?version 1\.0.*?NovaMart benchmark database': 'Decision brief - version 1.0 - NovaMart benchmark database',
    r'NovaMart.*?retail dataset': 'NovaMart - retail dataset',
    r'NovaMart.*?investigation': 'NovaMart - investigation',
    r'NovaMart.*?sandbox': 'NovaMart - sandbox',
    r'NovaMart.*?approval': 'NovaMart - approval',
    r'NovaMart.*?record': 'NovaMart - record',
    r'NovaMart.*?audit': 'NovaMart - audit',
}

directory = "frontend/components/bolt"
for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith(".tsx") or file.endswith(".ts"):
            path = os.path.join(root, file)
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
            
            orig = content
            for old, new in replacements.items():
                content = re.sub(old, new, content)
            
            if content != orig:
                with open(path, "w", encoding="utf-8") as f:
                    f.write(content)
                print(f"Cleaned {path}")
