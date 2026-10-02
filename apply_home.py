import re
with open("frontend/components/bolt/HomeScreen.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Remove custom cursor: remove cursor-none, remove mousePos state, remove the pointer-events-none div
content = re.sub(r'const \[mousePos, setMousePos\] = useState\(\{ x: 0, y: 0 \}\);', '', content)
content = content.replace("cursor-none", "")
content = re.sub(r'const handleMouseMove = \(e: React.MouseEvent\) => \{[\s\S]*?\};', 'const handleMouseMove = (e: React.MouseEvent) => {};', content)
content = re.sub(r'<div[\s\S]*?pointer-events-none z-50[\s\S]*?</div>', '', content)

# 2. Fix the transform for 50vw/50vh and remove the SVG rect / adjust text
# The previous mask approach was complex. The user wants "make it white bg and medium grey font color. no outline."
# and zooming smoothly into the text.
# The user said: "make it white bg and medium grey font color. no outline... scrolling and entering through the words like a door - make it smoother."
# And "remove that ligthing effect from trace main text. keep it normal"
# I can just use standard HTML/CSS text scaling instead of an SVG mask if it's easier, or keep the SVG text but make it grey.
# The SVG text approach:
old_svg = r'<svg className="w-full h-full" preserveAspectRatio="xMidYMid slice">[\s\S]*?</svg>'
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

content = re.sub(old_svg, new_svg, content)

with open("frontend/components/bolt/HomeScreen.tsx", "w", encoding="utf-8") as f:
    f.write(content)
