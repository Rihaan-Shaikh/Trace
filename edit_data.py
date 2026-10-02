import re

with open('frontend/components/bolt/DataScreens.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_dropzone = """        {/* Drop zone */}
        <div
          className="border-2 border-dashed rule rounded-sm bg-parchment-50 px-8 py-12 text-center mb-8 cursor-pointer hover:bg-transparent transition-colors group"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".csv,.xlsx,.json"
          />
          <div className="w-10 h-10 rounded-full bg-parchment-100 flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
            <UploadCloud className="w-5 h-5 text-ink-600" />
          </div>
          <div className="text-sm text-ink-600 font-medium mb-1">
            {isUploading ? 'Ingesting and profiling dataset...' : 'Drop business CSV or click to upload'}
          </div>
          <div className="text-xs text-ink-400">
            CSV, XLSX, JSON • Ingested directly into PostgreSQL with automatic health audits
          </div>
        </div>"""

new_dropzone = """        {/* Drop zone */}
        <div
          className="relative border-2 border-dashed rule rounded-sm bg-parchment-50 px-8 py-12 text-center mb-8 cursor-pointer hover:bg-transparent transition-colors group overflow-hidden"
          onClick={() => !isUploading && fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".csv,.xlsx,.json"
            disabled={isUploading}
          />

          {isUploading ? (
            <div className="relative z-10 w-full flex flex-col items-center justify-center">
              <div className="flex items-end justify-center gap-1 mb-6 h-8">
                {[...Array(7)].map((_, i) => (
                  <div 
                    key={i}
                    className="w-1 bg-ink-900 animate-pulse"
                    style={{ 
                      height: `${20 + (i % 3) * 10}px`,
                      animationDelay: `${i * 0.1}s`,
                      animationDuration: '0.7s'
                    }}
                  />
                ))}
              </div>
              
              <div className="text-sm font-mono tracking-widest text-ink-900 mb-1 uppercase font-semibold">
                Ingesting & Profiling
              </div>
              <div className="text-[10px] font-mono text-ink-400 uppercase tracking-widest">
                Mapping schema to entity graph...
              </div>

              <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-brass-400 to-transparent opacity-60 blur-[1px] animate-pulse" />
            </div>
          ) : (
            <div className="relative z-10">
              <div className="w-10 h-10 rounded-full bg-parchment-100 flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform shadow-sm border border-ink-100">
                <UploadCloud className="w-5 h-5 text-ink-600" />
              </div>
              <div className="text-sm text-ink-700 font-medium mb-1">
                Drop business CSV or click to upload
              </div>
              <div className="text-xs text-ink-400">
                CSV, XLSX, JSON • Ingested directly into PostgreSQL with automatic health audits
              </div>
            </div>
          )}
          
          {isUploading && (
            <div className="absolute inset-0 z-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(0,0,0,0.03)_50%,transparent_100%)] bg-[length:100%_4px] opacity-20" />
          )}
        </div>"""

content = content.replace(old_dropzone.replace('•', ''), new_dropzone) # Handle weird character encoding from terminal
content = content.replace(old_dropzone, new_dropzone)

# Also fix the font in the entity graph nodes. The user asked for "the other fonts from the website", which is `font-sans` or just default.
# I had: `<div className="text-[10px] font-mono text-ink-700 capitalize tracking-widest font-semibold text-center">{entity.name}</div>`
content = content.replace('font-mono text-ink-700 capitalize tracking-widest font-semibold', 'font-sans text-ink-800 capitalize font-medium')

with open('frontend/components/bolt/DataScreens.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
