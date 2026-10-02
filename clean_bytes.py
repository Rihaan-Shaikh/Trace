import os
with open('frontend/components/bolt/DecisionBrief.tsx', 'rb') as f:
    c = f.read()
c = c.replace(b'\xef\xbf\xbd%^', b'\xe2\x89\x88')
c = c.replace(b'\xef\xbf\xbd^\'', b'~')
c = c.replace(b'\xef\xbf\xbd%\'', b'~')
c = c.replace(b'\xef\xbf\xbd', b'')
with open('frontend/components/bolt/DecisionBrief.tsx', 'wb') as f:
    f.write(c)
