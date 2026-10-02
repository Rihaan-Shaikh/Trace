import re

with open('frontend/components/bolt/HomeScreen.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'currentProgress.current += (targetProgress.current - currentProgress.current) * 0.05;',
    'currentProgress.current += (targetProgress.current - currentProgress.current) * 0.015;'
)

content = content.replace(
    'const scale = 1 + Math.pow(scrollProgress, 4) * 150;',
    'const scale = 1 + Math.pow(scrollProgress, 4) * 200;'
)

layer2_pattern = r'\{\/\* LAYER 2: The Door Mask.*?</svg>'

layer2_new = """{/* LAYER 2: The Zoom Door */}
        {scrollProgress < 1 && (
          <div 
            className="absolute inset-0 z-20 pointer-events-none bg-parchment-100 flex items-center justify-center" 
            style={{ opacity: maskOpacity }}
          >
            <svg className="w-full h-full" preserveAspectRatio="xMidYMid slice">
              <g transform={`translate(${screenDim.w/2}, ${screenDim.h/2}) scale(${scale}) rotate(-12)`}>
                 <text 
                    x="-1.5vw" y="0" dy=".35em"
                    textAnchor="middle" 
                    fill="#9ca3af"
                    fontSize="24vw" 
                    fontFamily="var(--font-serif)" 
                    fontStyle="italic" 
                    letterSpacing="-0.06em"
                 >
                   TRACE
                 </text>
              </g>
            </svg>"""

content = re.sub(layer2_pattern, layer2_new, content, flags=re.DOTALL)

with open('frontend/components/bolt/HomeScreen.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
