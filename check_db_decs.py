import sqlite3
conn = sqlite3.connect("trace.db")
c = conn.cursor()
c.execute("SELECT id, title FROM decisions")
print(c.fetchall())
