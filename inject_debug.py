import re

path = "backend/app/services/investigation_service.py"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

debug_code = """
        if not confirmed_mappings:
            fixture_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../data/novamart"))
            with open("C:/Users/Rud/Desktop/Trace/debug_fixture.txt", "w") as df:
                df.write(f"__file__: {__file__}\\n")
                df.write(f"fixture_dir: {fixture_dir}\\n")
                df.write(f"exists: {os.path.exists(os.path.join(fixture_dir, 'transactions.csv'))}\\n")
            if os.path.exists(os.path.join(fixture_dir, "transactions.csv")):
"""

content = content.replace(
    '        if not confirmed_mappings:\n            fixture_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../data/novamart"))\n            if os.path.exists(os.path.join(fixture_dir, "transactions.csv")):',
    debug_code
)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Injected debug code")
