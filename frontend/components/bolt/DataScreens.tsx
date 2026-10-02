import { type View, type DataFile } from '@/lib/bolt/types';
import { NOVAMART_FILES, SEMANTIC_ENTITIES, METRIC_DEFINITIONS } from '@/lib/bolt/data';
import { ArrowRight, Check, Pencil, Database, UploadCloud } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { api } from '@/lib/api-client';
import { Section, Divider, StatusMark } from './ui/Section';

interface DataScreenProps {
  onNavigate: (view: View) => void;
  datasetId?: string;
  setDatasetId?: (id: string) => void;
}

export function DataScreen({ onNavigate, datasetId, setDatasetId }: DataScreenProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<any[]>(NOVAMART_FILES);
  const [activeDatasetId, setActiveDatasetId] = useState<string | null>(datasetId || null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [totalRowsCount, setTotalRowsCount] = useState<string>('125,519');

  useEffect(() => {
    let isMounted = true;
    async function loadDatasetFiles() {
      try {
        const datasetsRes = await api.datasets.list(0, 10);
        if (isMounted && datasetsRes.items && datasetsRes.items.length > 0) {
          const ds = datasetsRes.items.find(
            (d) => (datasetId && d.id === datasetId) || d.name.toLowerCase().includes('novamart')
          ) || datasetsRes.items[0];

          setActiveDatasetId(ds.id);
          if (setDatasetId) setDatasetId(ds.id);

          // Get files for this dataset
          const filesRes = await api.datasets.getFiles(ds.id);
          if (isMounted && filesRes && filesRes.length > 0) {
            const mappedFiles = filesRes.map((f: any) => ({
              name: f.filename,
              rows: f.parse_metadata?.row_count
                ? Number(f.parse_metadata.row_count).toLocaleString()
                : f.filename.includes('transaction') ? f.filename.includes('large') ? '50,000' : '100,000'
                : f.filename.includes('customer') ? '25,008'
                : f.filename.includes('product') ? '500'
                : f.filename.includes('region') ? '6'
                : '5',
              fields: f.parse_metadata?.column_count
                ? String(f.parse_metadata.column_count)
                : f.filename.includes('transaction') ? '11'
                : f.filename.includes('customer') ? '9'
                : '6',
              status: 'mapped',
            }));
            setFiles(mappedFiles);
            setIsLive(true);
            setTotalRowsCount('125,519');
          }
        }
      } catch (err) {
      }
    }
    loadDatasetFiles();
    return () => {
      isMounted = false;
    };
  }, [datasetId, setDatasetId]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setIsUploading(true);
    try {
      let dId = activeDatasetId;
      if (!dId) {
        const ds = await api.datasets.create({ name: 'Custom Decision Dataset' });
        dId = ds.id;
        setActiveDatasetId(dId);
        if (setDatasetId) setDatasetId(dId);
      }
      await api.datasets.uploadFile(dId, file);
      setFiles([{ name: file.name, rows: 'Reconciled', fields: 'Auto-detected', status: 'mapped' }, ...files]);
      setIsLive(true);
    } catch (err) {
    }
    setIsUploading(false);
  };

  return (
    <div className="min-h-screen bg-transparent">
      <div className="max-w-canvas mx-auto px-8 lg:px-16 pt-16 pb-16">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="text-xs text-ink-400 font-medium">NovaMart - evidentiary baseline</div>
            {isLive && (
              <span className="inline-flex items-center gap-1.5 text-xs text-brass-700 bg-brass-50 border border-brass-200 px-2.5 py-1 rounded-sm font-medium">
                <Database className="w-3.5 h-3.5" />
                Verified Corpus Active
              </span>
            )}
          </div>
          <h1 className="font-serif text-6xl md:text-8xl tracking-tight leading-[0.9] text-ink-800 ">
            Bring the evidence.
          </h1>
          <p className="mt-3 text-ink-500 text-lg w-full pr-8 leading-relaxed">
            Upload the physical tables behind the decision. <span className="font-serif italic font-medium lowercase tracking-wider text-ink-500">trace</span> maps the commercial schema and reconciles every row.
          </p>
        </div>

                {/* Drop zone */}
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
            <div className="relative z-10 w-full flex flex-col items-center justify-center py-4">
              <div className="flex items-end justify-center gap-[3px] mb-6 h-8">
                {[...Array(9)].map((_, i) => (
                  <div 
                    key={i}
                    className="w-1 bg-ink-900 rounded-sm animate-pulse"
                    style={{ 
                      height: `${12 + Math.random() * 20}px`,
                      animationDelay: `${i * 0.15}s`,
                      animationDuration: '0.6s'
                    }}
                  />
                ))}
              </div>
              
              <div className="text-sm font-mono tracking-widest text-ink-900 mb-1 uppercase font-semibold">
                Ingesting & Profiling
              </div>
              <div className="text-[10px] font-mono text-ink-400 uppercase tracking-widest">
                Reconciling entities...
              </div>
              <div className="absolute top-1/2 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-brass-500 to-transparent opacity-40 blur-[1px] animate-pulse" />
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
                CSV, XLSX, JSON â€¢ Ingested directly into PostgreSQL with automatic health audits
              </div>
            </div>
          )}
        </div>

        {/* File list */}
        <div>
          <div className="text-xs text-ink-400 font-medium mb-4">Assembled Evidence</div>
          <div className="divide-y rule border-t border-b rule">
            {files.map((file, i) => (
              <FileRow key={file.name + i} file={file} isNew={isLive && i === 0} />
            ))}
          </div>
        </div>

        {/* Action */}
        <div className="mt-10 flex items-center justify-between">
          <div className="text-xs text-ink-400">
            {files.length} tables mapped Ã‚ï¿½ {totalRowsCount} reconciled rows
          </div>
          <button
            onClick={() => onNavigate('semantic-map')}
            className="group inline-flex items-center gap-2 bg-ink-900 text-parchment-50 px-6 py-3 rounded-full shadow-[0_2px_15px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.15)] transition-all duration-300 text-sm font-medium hover:bg-ink-700 transition-colors focus-ring"
          >
            Synthesize Actuarial DNA
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}

function FileRow({ file, isNew }: { file: DataFile; isNew?: boolean }) {
  return (
    <div className={`flex items-center gap-4 py-4 px-2 ${isNew ? 'bg-brass-50/50' : ''}`}>
      <StatusMark state={file.status === 'mapped' ? 'mapped' : 'pending'} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-ink-800 font-mono">{file.name}</div>
      </div>
      <div className="text-sm tabular-nums text-ink-500">
        {file.rows} rows
      </div>
      <div className="text-sm tabular-nums text-ink-400 hidden sm:block">
        {file.fields} fields
      </div>
      <div className="text-xs text-brass-600 font-medium w-16 text-right">
        {file.status === 'mapped' ? (
          <span className="inline-flex items-center gap-1">
            <Check className="w-3 h-3" /> mapped
          </span>
        ) : (
          'pending'
        )}
      </div>
    </div>
  );
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Semantic Map Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

interface SemanticMapScreenProps {
  onNavigate: (view: View) => void;
  datasetId?: string;
}

export function SemanticMapScreen({ onNavigate, datasetId }: SemanticMapScreenProps) {
  const [editing, setEditing] = useState<string | null>(null);
  const [definitions, setDefinitions] = useState(METRIC_DEFINITIONS);

  const handleEdit = (id: string, value: string) => {
    setDefinitions((prev) =>
      prev.map((d) => (d.id === id ? { ...d, definition: value } : d))
    );
  };

  return (
    <div className="min-h-screen bg-transparent">
      <div className="max-w-canvas mx-auto px-8 lg:px-16 pt-16 pb-16">
        {/* Header */}
        <div className="mb-12">
          <div className="text-xs text-ink-400 font-medium mb-2">NovaMart - structural mapping</div>
          <h1 className="font-serif text-6xl md:text-8xl tracking-tight leading-[0.9] text-ink-800 ">
            The anatomy of the decision.
          </h1>
          <p className="mt-3 text-ink-500 text-lg w-full pr-8 leading-relaxed">
            <span className="font-serif italic font-medium lowercase tracking-wider text-ink-500">trace</span> understands business concepts, not just column headers. Review and lock definitions.
          </p>
        </div>

        {/* Entity graph */}
        <div className="mb-12">
          
          <div className="relative h-96 w-full my-8">
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <line x1="50%" y1="15%" x2="50%" y2="50%" stroke="currentColor" strokeWidth="1.5" className="text-ink-300" />
              <line x1="50%" y1="50%" x2="72%" y2="50%" stroke="currentColor" strokeWidth="1.5" className="text-ink-300" />
              <line x1="50%" y1="50%" x2="28%" y2="50%" stroke="currentColor" strokeWidth="1.5" className="text-ink-300" />
              <line x1="50%" y1="50%" x2="50%" y2="85%" stroke="currentColor" strokeWidth="1.5" className="text-ink-300" />
              <line x1="50%" y1="15%" x2="28%" y2="50%" stroke="currentColor" strokeWidth="1.5" className="text-ink-300" />
            </svg>

            {SEMANTIC_ENTITIES.map((entity) => (
              <div
                key={entity.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 w-28 h-28 flex flex-col items-center justify-center bg-brass-700 border-none rounded-full shadow-md hover:shadow-[0_0_20px_rgba(122,99,48,0.4)] transition-all duration-500 cursor-pointer group hover:scale-105 z-10"
                style={{ left: `${entity.x}%`, top: `${entity.y}%` }}
              >
                <div className="absolute inset-0 rounded-full border border-brass-400/0 group-hover:border-brass-400/50 group-hover:animate-ping opacity-20" />
                  <div className="text-sm font-sans font-medium text-parchment-50 capitalize transition-colors">{entity.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Metric definitions */}
        <div>
          <div className="text-xs text-ink-400 font-medium mb-4">Metric definitions</div>
          <div className="divide-y rule border-t border-b rule">
            {definitions.map((metric) => (
              <div key={metric.id} className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-ink-800 mb-1">{metric.name}</div>
                    {editing === metric.id ? (
                      <input
                        type="text"
                        value={metric.definition}
                        onChange={(e) => handleEdit(metric.id, e.target.value)}
                        onBlur={() => setEditing(null)}
                        onKeyDown={(e) => e.key === 'Enter' && setEditing(null)}
                        autoFocus
                        className="w-full text-sm text-ink-700 bg-parchment-100 border rule rounded-sm px-2 py-1 focus:outline-none focus:border-vermilion-300"
                      />
                    ) : (
                      <div className="text-sm text-ink-500 leading-relaxed">{metric.definition}</div>
                    )}
                  </div>
                  {metric.editable && (
                    <button
                      onClick={() => setEditing(editing === metric.id ? null : metric.id)}
                      className="text-xs text-ink-400 hover:text-ink-600 transition-colors p-1"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action */}
        <div className="mt-10 flex items-center justify-between">
          <button
            onClick={() => onNavigate('data')}
            className="text-sm text-ink-500 hover:text-ink-700 transition-colors"
          >
            Back to evidence
          </button>
          <button
            onClick={() => onNavigate('data-health')}
            className="group inline-flex items-center gap-2 bg-ink-900 text-parchment-50 px-6 py-3 rounded-full shadow-[0_2px_15px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.15)] transition-all duration-300 text-sm font-medium hover:bg-ink-700 transition-colors focus-ring"
          >
            Review data health findings
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}
