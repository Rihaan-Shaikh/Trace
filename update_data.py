import re

path_data = "frontend/lib/bolt/data.ts"
with open(path_data, "r", encoding="utf-8") as f:
    content_data = f.read()

content_data = content_data.replace(
    "{ id: 'customer', name: 'Customer', x: 50, y: 15, connectedTo: ['transaction', 'region'] }",
    "{ id: 'customer', name: 'Customer', x: 50, y: 25, connectedTo: ['transaction', 'region'] }"
)
content_data = content_data.replace(
    "{ id: 'product', name: 'Product', x: 85, y: 50, connectedTo: ['transaction'] }",
    "{ id: 'product', name: 'Product', x: 75, y: 50, connectedTo: ['transaction'] }"
)
content_data = content_data.replace(
    "{ id: 'region', name: 'Region', x: 15, y: 50, connectedTo: ['transaction'] }",
    "{ id: 'region', name: 'Region', x: 25, y: 50, connectedTo: ['transaction'] }"
)
content_data = content_data.replace(
    "{ id: 'campaign', name: 'Campaign', x: 50, y: 85, connectedTo: ['transaction'] }",
    "{ id: 'campaign', name: 'Campaign', x: 50, y: 75, connectedTo: ['transaction'] }"
)

with open(path_data, "w", encoding="utf-8") as f:
    f.write(content_data)
print("Updated data.ts")
