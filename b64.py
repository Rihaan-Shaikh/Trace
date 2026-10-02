import base64
with open("frontend/components/bolt/DecisionBrief.tsx", "rb") as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if b"Probability of net loss" in line:
        print(f"Line {i+1}: {base64.b64encode(line)}")
