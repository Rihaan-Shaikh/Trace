import os
import re

directory = "frontend/components/bolt"
bad_span = '<span className="font-serif italic font-medium lowercase tracking-wider text-ink-500">trace</span>'

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith(".tsx"):
            path = os.path.join(root, file)
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            
            orig = content
            
            # Find any occurrence of the span inside a string attribute (e.g. subtitle="...")
            # We can just look for double quotes surrounding it.
            # Actually, the simplest way is to find `subtitle="...<span...` and fix it.
            # But the span has double quotes inside it, which broke the outer string!
            # The broken text looks like:
            # subtitle="...<span className="font-serif...
            # We can use a regex to find subtitle="[^"]*<span className="font-serif italic font-medium lowercase tracking-wider text-ink-500">trace</span>[^"]*"
            # Wait, the double quotes in the span actually closed the first string!
            # Let's just manually fix the known ones.
            
            content = content.replace(
                'subtitle="How the recommendation changed after <span className="font-serif italic font-medium lowercase tracking-wider text-ink-500">trace</span> argued against itself."',
                'subtitle="How the recommendation changed after trace argued against itself."'
            )
            content = content.replace(
                'subtitle="<span className="font-serif italic font-medium lowercase tracking-wider text-ink-500">trace</span> tracks whether its predicted exposure matched what actually happened."',
                'subtitle="trace tracks whether its predicted exposure matched what actually happened."'
            )
            content = content.replace(
                'subtitle="How <span className="font-serif italic font-medium lowercase tracking-wider text-ink-500">trace</span> reconstructed the baseline coverage profile."',
                'subtitle="How trace reconstructed the baseline coverage profile."'
            )
            
            # Are there others?
            # Let's just find `<span className="font-serif italic font-medium lowercase tracking-wider text-ink-500">trace</span>` and if it's inside `subtitle="...`
            # Let's replace any `="...<span className...trace</span>..."` by regex
            content = re.sub(
                r'([a-zA-Z_]+)="([^"]*)<span className="font-serif italic font-medium lowercase tracking-wider text-ink-500">trace</span>([^"]*)"',
                r'\1="\2trace\3"',
                content
            )
            
            # Since the double quotes in the span already broke the string, the regex above MIGHT not match because the outer quotes are broken by the inner quotes!
            # The literal text in the file right now is:
            # subtitle="How the recommendation changed after <span className="font-serif italic font-medium lowercase tracking-wider text-ink-500">trace</span> argued against itself."
            # In python `content.replace` this exact literal will be matched and fixed!
            
            if content != orig:
                with open(path, "w", encoding="utf-8") as f:
                    f.write(content)
                print(f"Fixed string attributes in {path}")
