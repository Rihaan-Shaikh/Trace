import os
import re

files = [
    "frontend/components/bolt/DataHealthScreen.tsx",
    "frontend/components/bolt/LedgerScreen.tsx",
    "frontend/components/bolt/RateCardScreen.tsx",
]

for path in files:
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Check if finally is missing
    if "finally" not in content:
        # We need to append finally { if (isMounted) setIsLoading(false); } after the catch block of the load function.
        # The easiest way is to find `} catch (err) { ... }` inside the `load` function and replace it.
        # Since it might span multiple lines, let's just use re.sub with DOTALL.
        content = re.sub(
            r'(\}\s*catch\s*\(err\)\s*\{[^}]*\})',
            r'\1 finally {\n        if (isMounted) setIsLoading(false);\n      }',
            content,
            count=1 # only the first catch block which is the load fetch
        )
        
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Fixed {path}")
