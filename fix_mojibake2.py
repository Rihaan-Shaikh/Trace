import os
import re

directory = 'frontend/components/bolt'

replacements = [
    (r'\%\^', '˜'),
    (r'\^''', '~'),
    (r'A', '·'),
    (r'"\?"\?', '---'),
]

for filename in os.listdir(directory):
    if filename.endswith('.tsx'):
        filepath = os.path.join(directory, filename)
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        original = content
        for old, new in replacements:
            content = re.sub(old, new, content)
            
        # Hard replace specific instances we saw in console
        content = content.replace("%^", "˜")
        content = content.replace("^'", "~")
        content = content.replace("A", "·")
        content = content.replace("\"?\"?", "---")
        content = content.replace("â‰ˆ", "˜")
        content = content.replace("Â·", "·")
        content = content.replace("âˆ’", "-")
        content = content.replace("â€™", "'")
        content = content.replace("â€“", "-")
        content = re.sub(r'/\*.*?\*/', '', content) # Just remove all broken comments
        
        if content != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Fixed {filename}")
