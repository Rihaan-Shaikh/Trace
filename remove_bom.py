import os

def remove_bom(path):
    with open(path, "rb") as f:
        data = f.read()
    if data.startswith(b'\xef\xbb\xbf'):
        with open(path, "wb") as f:
            f.write(data[3:])
        print(f"Removed BOM from {path}")

directory = "frontend/components/bolt"
for file in os.listdir(directory):
    if file.endswith(".tsx"):
        remove_bom(os.path.join(directory, file))
