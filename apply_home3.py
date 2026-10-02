import re
with open("frontend/components/bolt/HomeScreen.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Remove mousePos state and targetMouse
content = re.sub(r'const \[mousePos, setMousePos\] = useState\(\{ x: 300, y: 300 \}\);\n', '', content)
content = re.sub(r'const targetMouse = useRef\(\{ x: 350, y: 350 \}\);\n', '', content)
content = re.sub(r'const currentMouse = useRef\(\{ x: 350, y: 350 \}\);\n', '', content)

# 2. In useEffect, remove mouse tracking logic
content = re.sub(r'// Initialize mouse position securely[\s\S]*?setMousePos\(\{ x: initX, y: initY \}\);\n    \}', '', content)
content = re.sub(r'// Smooth mouse follow for realistic inertia[\s\S]*?y: Math\.round\(currentMouse\.current\.y \* 10\) / 10,\n      \}\);', '', content)

# 3. Update handleMouseMove to be empty or remove it
content = re.sub(r'const handleMouseMove = \(e: React\.MouseEvent\) => \{[\s\S]*?\};\n', 'const handleMouseMove = () => {};\n', content)

# 4. Remove cursor-none
content = content.replace("cursor-none", "")

# 5. Remove the cursor div itself
content = re.sub(r'<div\s+className="pointer-events-none z-50 fixed w-\[600px\].*?</div>', '', content, flags=re.DOTALL)

# 6. Update the SVG to use translate(50vw, 50vh) and remove text outline for solid grey
old_svg = r'<svg className="w-full h-full" preserveAspectRatio="xMidYMid slice">.*?</svg>'
new_svg = """<svg className="w-full h-full" preserveAspectRatio="xMidYMid slice">
              <g style={{ transform: `translate(50vw, 50vh) scale(${scale}) rotate(-12deg)` }}>
                <text 
                  x="-1.5vw" y="0" dy=".35em"
                  textAnchor="middle" 
                  fontFamily="var(--font-serif)" 
                  fontStyle="italic"
                  fontWeight="bold"
                  fontSize="28vw"
                  fill="#9ca3af"
                >
                  TRACE
                </text>
              </g>
            </svg>"""
content = re.sub(old_svg, new_svg, content, flags=re.DOTALL)

with open("frontend/components/bolt/HomeScreen.tsx", "w", encoding="utf-8") as f:
    f.write(content)
