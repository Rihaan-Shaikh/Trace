import re

path = "frontend/components/bolt/InvestigationScreen.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add api import
if "import { api }" not in content:
    content = content.replace(
        "import { Divider } from './ui/Section';",
        "import { Divider } from './ui/Section';\nimport { api } from '@/lib/api-client';"
    )

# 2. Add isInvestigating state and the runInvestigation effect
if "const [isInvestigating" not in content:
    content = content.replace(
        'const [visibleCount, setVisibleCount] = useState(0);',
        'const [visibleCount, setVisibleCount] = useState(0);\n  const [isInvestigating, setIsInvestigating] = useState(true);\n\n  useEffect(() => {\n    let isMounted = true;\n    async function run() {\n      if (!decisionId) { setIsInvestigating(false); return; }\n      try {\n        await api.decisions.runInvestigation(decisionId);\n      } catch (err) {\n        console.error(err);\n      } finally {\n        if (isMounted) setIsInvestigating(false);\n      }\n    }\n    run();\n    return () => { isMounted = false; };\n  }, [decisionId]);'
    )

# 3. Update allComplete logic
content = content.replace(
    'const allComplete = visibleCount >= INVESTIGATION_STAGES.length;',
    'const allComplete = visibleCount >= INVESTIGATION_STAGES.length && !isInvestigating;'
)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated InvestigationScreen.tsx")
