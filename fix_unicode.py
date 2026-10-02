import os
import re

directory = 'frontend/components/bolt'

replacements = [
    (r'A', '·'),
    (r'A ', '· '),
    (r'mapped A ', 'mapped · '),
    (r'completed A ', 'completed · '),
    (r'\?\?.*', '---'),
    (r'%\^', '˜'),
    (r'\^\'', '~'),
    (r'â‰ˆ', '˜'),
    (r'Â·', '·'),
    (r'/\* "\?.* \*/', '/* --- */'),
]

for filename in os.listdir(directory):
    if filename.endswith('.tsx'):
        filepath = os.path.join(directory, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original = content
        for old, new in replacements:
            content = re.sub(old, new, content)
            
        # specifically fix "NovaMart A evidence" -> "NovaMart · evidence"
        content = content.replace("NovaMart A evidence", "NovaMart · evidence")
        content = content.replace("mapped A ", "mapped · ")
        content = content.replace("completed A ", "completed · ")
        content = content.replace("%^", "˜")
        content = content.replace("â‰ˆ", "˜")
        content = content.replace("Â·", "·")
        # specifically fix comments
        content = re.sub(r'/\* [^/]* \*/', '/* --- */', content)
        
        if content != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Fixed {filename}")
