import { type View, type DataFile } from '@/lib/bolt/types';
import { NOVAMART_FILES, SEMANTIC_ENTITIES, METRIC_DEFINITIONS } from '@/lib/bolt/data';
import { ArrowRight, Check, Pencil } from 'lucide-react';
import { useState, useRef } from 'react';
import { api } from '@/lib/api-client';
import { Section, Divider, StatusMark } from './ui/Section';

interface DataScreenProps {
  onNavigate: (view: View) => void;
}

export function DataScreen({ onNavigate }: DataScreenProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<any[]>(NOVAMART_FILES);
  const [datasetId, setDatasetId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setIsUploading(true);
    try {
      let dId = datasetId;
      if (!dId) {
        const ds = await api.datasets.create({ name: 'Custom Dataset' });
        dId = ds.id;
        setDatasetId(dId);
      }
      await api.datasets.uploadFile(dId, file);
      setFiles([{ name: file.name, rows: 'Calculating...', status: 'mapped' }, ...files]);
    } catch (err) {
      console.error(err);
    }
    setIsUploading(false);
  };
  return (
    <div className="min-h-screen bg-base-900">
      <div className="max-w-canvas mx-auto px-8 lg:px-16 pt-16 pb-16">
        {/* Header */}
        <div className="mb-12">
          <div className="text-xs text-ink-400 font-medium mb-2">NovaMart &#183; evidence</div>
          <h1 className="font-serif text-hero text-ink-50 text-balance">Bring the evidence.</h1>
          <p className="mt-3 text-ink-300 text-lg max-w-prose-doc leading-relaxed">
            Upload the files behind the decision. TRACE will map the business before it evaluates the call.
          </p>
        </div>

        {/* Drop zone */}
        <div className="border-2 border-dashed rule rounded-sm bg-base-800 px-8 py-12 text-center mb-8 cursor-pointer hover:bg-base-900 transition-colors" onClick={() => fileInputRef.current?.click()}>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".csv,.xlsx,.json" />
          <div className="text-sm text-ink-400 mb-1">{isUploading ? 'Uploading...' : 'Drop files here or click to upload'}</div>
          <div className="text-xs text-ink-300">CSV, XLSX, JSON &#183; up to 50MB per file</div>
        </div>

        {/* File list */}
        <div>
          <div className="text-xs text-ink-400 font-medium mb-4">Uploaded files</div>
          <div className="divide-y rule border-t border-b rule">
            {files.map((file, i) => (
              <FileRow key={file.name + i} file={file} />
            ))}
          </div>
        </div>

        {/* Action */}
        <div className="mt-10 flex items-center justify-between">
          <div className="text-xs text-ink-400">
            5 files mapped &#183; 215,762 rows total
          </div>
          <button
            onClick={() => api.datasets.seedNovaMart().then(() => onNavigate('semantic-map')).catch(() => onNavigate('semantic-map'))}
            className="group inline-flex items-center gap-2 bg-ink-50 text-base-900 px-6 py-3 rounded-sm text-sm font-medium hover:bg-ink-700 transition-colors focus-ring"
          >
            Map the business
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}

function FileRow({ file }: { file: DataFile }) {
  return (
    <div className="flex items-center gap-4 py-4 px-2">
      <StatusMark state={file.status === 'mapped' ? 'mapped' : 'pending'} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-ink-50 font-mono">{file.name}</div>
      </div>
      <div className="text-sm tabular-nums text-ink-300">
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

// ââ Semantic Map âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

interface SemanticMapScreenProps {
  onNavigate: (view: View) => void;
}

export function SemanticMapScreen({ onNavigate }: SemanticMapScreenProps) {
  const [editing, setEditing] = useState<string | null>(null);
  const [definitions, setDefinitions] = useState(METRIC_DEFINITIONS);

  const handleEdit = (id: string, value: string) => {
    setDefinitions((prev) =>
      prev.map((d) => (d.id === id ? { ...d, definition: value } : d))
    );
  };

  return (
    <div className="min-h-screen bg-base-900">
      <div className="max-w-canvas mx-auto px-8 lg:px-16 pt-16 pb-16">
        {/* Header */}
        <div className="mb-12">
          <div className="text-xs text-ink-400 font-medium mb-2">NovaMart &#183; business map</div>
          <h1 className="font-serif text-hero text-ink-50 text-balance">
            TRACE is making sure we mean the same thing.
          </h1>
          <p className="mt-3 text-ink-300 text-lg max-w-prose-doc leading-relaxed">
            Before reasoning begins, TRACE maps the business and confirms every metric definition.
          </p>
        </div>

        {/* Entity map */}
        <div className="grid lg:grid-cols-[1fr_1fr] gap-12">
          <div>
            <div className="text-xs text-ink-400 font-medium mb-6">Entities</div>
            <div className="relative w-full aspect-square max-w-md surface border rule rounded-sm">
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
                {/* Connections */}
                {SEMANTIC_ENTITIES.map((entity) =>
                  entity.connectedTo.map((targetId) => {
                    const target = SEMANTIC_ENTITIES.find((e) => e.id === targetId);
                    if (!target) return null;
                    return (
                      <line
                        key={`${entity.id}-${targetId}`}
                        x1={entity.x}
                        y1={entity.y}
                        x2={target.x}
                        y2={target.y}
                        stroke="rgba(28,27,24,0.12)"
                        strokeWidth="0.3"
                      />
                    );
                  })
                )}
                {/* Nodes */}
                {SEMANTIC_ENTITIES.map((entity) => (
                  <g key={entity.id}>
                    <circle
                      cx={entity.x}
                      cy={entity.y}
                      r="7"
                      fill="#f7f3ea"
                      stroke="rgba(28,27,24,0.2)"
                      strokeWidth="0.3"
                    />
                    <text
                      x={entity.x}
                      y={entity.y + 0.8}
                      textAnchor="middle"
                      fontSize="3"
                      fill="#1c1b18"
                      fontWeight="500"
                      fontFamily="Inter, sans-serif"
                    >
                      {entity.name}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
            <div className="mt-4 text-xs text-ink-400 leading-relaxed max-w-md">
              Five entities mapped from uploaded data. TRACE identified relationships between
              customers, products, transactions, regions, and campaigns.
            </div>
          </div>

          {/* Metric definitions */}
          <div>
            <div className="text-xs text-ink-400 font-medium mb-6">Metric definitions</div>
            <div className="space-y-0 divide-y rule border-t border-b rule">
              {definitions.map((metric) => (
                <div key={metric.id} className="py-4 px-1">
                  <div className="flex items-baseline justify-between gap-4 mb-1">
                    <div className="text-sm font-medium text-ink-50">{metric.name}</div>
                    {metric.editable && (
                      <button
                        onClick={() => setEditing(editing === metric.id ? null : metric.id)}
                        className="text-xs text-ink-400 hover:text-vermilion-600 transition-colors inline-flex items-center gap-1"
                      >
                        <Pencil className="w-3 h-3" />
                        edit
                      </button>
                    )}
                  </div>
                  {editing === metric.id ? (
                    <input
                      type="text"
                      value={metric.definition}
                      onChange={(e) => handleEdit(metric.id, e.target.value)}
                      onBlur={() => setEditing(null)}
                      onKeyDown={(e) => e.key === 'Enter' && setEditing(null)}
                      autoFocus
                      className="w-full text-sm text-ink-200 bg-base-900 border rule rounded-sm px-2 py-1 mt-1 focus:outline-none focus:border-vermilion-300"
                    />
                  ) : (
                    <div className="text-sm text-ink-300 leading-relaxed">{metric.definition}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action */}
        <Divider className="mt-12" />
        <div className="mt-8 flex items-center justify-between">
          <div className="text-xs text-ink-400">
            7 metrics defined &#183; 5 entities mapped
          </div>
          <button
            onClick={() => onNavigate('data-health')}
            className="group inline-flex items-center gap-2 bg-ink-50 text-base-900 px-6 py-3 rounded-sm text-sm font-medium hover:bg-ink-700 transition-colors focus-ring"
          >
            Check the evidence
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}

