import re

path = "frontend/components/bolt/HomeScreen.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Add the useEffect logic to scroll down if decisionText is present
effect_code = """  useEffect(() => {
    if (decisionText.trim().length > 0) {
      window.scrollTo({ top: window.innerHeight, behavior: 'instant' });
      targetProgress.current = 1;
      currentProgress.current = 1;
      setScrollProgress(1);
    }
  }, []);

  useEffect(() => {"""

content = content.replace("  useEffect(() => {", effect_code, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated HomeScreen to auto-scroll")
