import re

path = "frontend/lib/api-client.ts"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    'fetchJson<any>(/decisions/, { method: \'PATCH\', body: JSON.stringify(data) }),',
    'fetchJson<any>(`/decisions/${id}`, { method: \'PATCH\', body: JSON.stringify(data) }),'
)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
