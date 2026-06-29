import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  UploadCloud,
  FileText,
  X,
  Loader2,
  CheckCircle2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatsBar } from '@/components/StatsBar'
import { cn, formatBytes } from '@/lib/utils'

const ALLOWED = [
  'pdf', 'txt', 'md', 'markdown', 'csv', 'tsv', 'xlsx', 'xls', 'xlsm',
  'docx', 'json', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tiff',
  'log', 'py', 'js', 'ts', 'html', 'css', 'yaml', 'yml', 'xml',
]
const ACCEPT = ALLOWED.map((e) => `.${e}`).join(',')
const ALLOWED_RE = new RegExp(`\\.(${ALLOWED.join('|')})$`, 'i')

export function UploadZone({ onUpload, uploading, stats }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [files, setFiles] = useState([])

  function addFiles(list) {
    const picked = Array.from(list).filter((f) => ALLOWED_RE.test(f.name))
    if (picked.length) setFiles((prev) => dedupe([...prev, ...picked]))
  }

  function dedupe(arr) {
    const seen = new Set()
    return arr.filter((f) => {
      const k = f.name + f.size
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
  }

  function removeFile(idx) {
    setFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/15">
          <UploadCloud className="h-5 w-5 text-brand-400" />
        </span>
        <div>
          <CardTitle>Upload anything</CardTitle>
          <p className="text-xs text-faint">PDF · Office · data · images · multiple allowed</p>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        {/* Dropzone */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            addFiles(e.dataTransfer.files)
          }}
          className={cn(
            'group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-all duration-200',
            dragging
              ? 'border-cyan bg-cyan/10'
              : 'border-border hover:border-brand-500/60 hover:bg-brand-500/5'
          )}
        >
          <motion.div
            animate={dragging ? { scale: 1.1 } : { scale: 1 }}
            className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500/20 to-cyan/20"
          >
            <UploadCloud
              className={cn(
                'h-7 w-7 transition-colors',
                dragging ? 'text-cyan' : 'text-brand-400'
              )}
            />
          </motion.div>
          <p className="text-sm font-medium text-ink">
            {dragging ? 'Drop to add files' : 'Drag & drop or click to browse'}
          </p>
          <p className="mt-1 text-xs text-faint">
            PDF, Word, Excel, CSV, JSON, images & more
          </p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files)
              e.target.value = ''
            }}
          />
        </div>

        {/* Selected file list */}
        <AnimatePresence initial={false}>
          {files.length > 0 && (
            <motion.ul
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2 overflow-hidden"
            >
              {files.map((file, idx) => (
                <motion.li
                  key={file.name + file.size}
                  layout
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  className="flex items-center gap-3 rounded-xl border border-border bg-surface/50 px-3 py-2.5"
                >
                  <FileText className="h-4 w-4 shrink-0 text-brand-400" />
                  <span className="flex-1 truncate text-sm text-ink">
                    {file.name}
                  </span>
                  <span className="text-xs text-faint">
                    {formatBytes(file.size)}
                  </span>
                  <button
                    onClick={() => removeFile(idx)}
                    disabled={uploading}
                    className="rounded-md p-1 text-faint transition-colors hover:bg-rose-500/10 hover:text-rose-400 disabled:opacity-40"
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </motion.li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>

        <Button
          className="w-full"
          size="lg"
          disabled={files.length === 0 || uploading}
          onClick={() => onUpload(files)}
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Indexing documents…
            </>
          ) : (
            <>
              <UploadCloud className="h-4 w-4" />
              Process {files.length > 0 ? `${files.length} file${files.length > 1 ? 's' : ''}` : 'files'}
            </>
          )}
        </Button>

        {/* Stats after successful indexing */}
        <AnimatePresence>
          {stats && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-2 text-sm text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                Knowledge base ready
              </div>
              <StatsBar stats={stats} />
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}
