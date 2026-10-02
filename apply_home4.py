import re
with open("frontend/components/bolt/HomeScreen.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Remove the custom cursor div completely using a manual string approach, since we know its exact structure
cursor_div = """        {/* "?"? Custom Light-Source Cursor (Active ONLY on this Hero Screen) "?"?"?"? */}
        <div
          className="fixed pointer-events-none z-50 transition-opacity duration-300"
          style={{
            left: `${mousePos.x}px`,
            top: `${mousePos.y}px`,
            transform: 'translate(-50%, -50%)',
            opacity: isHovering && scrollProgress < 0.95 ? 1 : 0,
          }}
        >
          {/* Ambient atmospheric aura */}
          <div className="w-16 h-16 -m-8 rounded-full bg-brass-400/20 blur-md" />
          
          {/* Concentric precision light emitter ring */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border border-brass-600/50 shadow-[0_0_12px_rgba(180,140,50,0.25)]" />
          
          {/* Core luminous point filament */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-brass-500 shadow-[0_0_10px_2px_rgba(200,160,60,0.9)]" />
        </div>"""

content = content.replace(cursor_div, "")

# 1. Remove mousePos state and targetMouse
content = re.sub(r'const \[mousePos, setMousePos\] = useState\(\{ x: 300, y: 300 \}\);\n', '', content)
content = re.sub(r'const targetMouse = useRef\(\{ x: 350, y: 350 \}\);\n', '', content)
content = re.sub(r'const currentMouse = useRef\(\{ x: 350, y: 350 \}\);\n', '', content)

# 2. In useEffect, remove mouse tracking logic
content = re.sub(r'// Initialize mouse position securely[\s\S]*?setMousePos\(\{ x: initX, y: initY \}\);\n    \}', '', content)
content = re.sub(r'// Smooth mouse follow for realistic inertia[\s\S]*?y: Math\.round\(currentMouse\.current\.y \* 10\) / 10,\n      \}\);', '', content)

# 3. Update handleMouseMove
content = re.sub(r'const handleMouseMove = \(e: React\.MouseEvent\) => \{[\s\S]*?\n  \};\n', 'const handleMouseMove = () => {};\n', content)

# 4. Remove cursor-none
content = content.replace("cursor-none", "")

# 5. Fix the SVG to translate(50vw, 50vh) and grey text
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
