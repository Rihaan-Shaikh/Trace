import re
with open("frontend/components/bolt/HomeScreen.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Remove the mouse tracking and custom cursor
content = re.sub(r'const \[mousePos, setMousePos\] = useState[\s\S]*?\};\n', '', content)
content = re.sub(r'const targetMouse = useRef[\s\S]*?\}\);', '', content)
content = re.sub(r'const currentMouse = useRef[\s\S]*?\}\);', '', content)
content = re.sub(r'const handleMouseMove = \(e: React.MouseEvent\) => \{[\s\S]*?\};\n', 'const handleMouseMove = (e: React.MouseEvent) => {};\n', content)
content = content.replace('cursor-none', '')

# Remove the cursor div
content = re.sub(r'<div\s+className="pointer-events-none z-50 fixed w-\[600px\].*?</div>', '', content, flags=re.DOTALL)

# Update SVG
content = re.sub(
    r'<svg className="w-full h-full" preserveAspectRatio="xMidYMid slice">.*?</svg>',
    """<svg className="w-full h-full" preserveAspectRatio="xMidYMid slice">
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
            </svg>""",
    content,
    flags=re.DOTALL
)

with open("frontend/components/bolt/HomeScreen.tsx", "w", encoding="utf-8") as f:
    f.write(content)
