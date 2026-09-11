import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Sheet,
  FileCode,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
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
const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10 MB

/* Classify a picked file into pending + an optional inline error. */
function validate(file) {
  if (!ALLOWED_RE.test(file.name)) {
    const ext = file.name.includes('.') ? file.name.split('.').pop().toUpperCase() : 'unknown'
    return `Unsupported file type (.${ext.toLowerCase()})`
  }
  if (file.size > MAX_FILE_BYTES) {
    return `Too large (${formatBytes(file.size)} · max ${formatBytes(MAX_FILE_BYTES)})`
  }
  if (file.size === 0) return 'File is empty'
  return null
}

function fileIcon(name) {
  const ext = name.split('.').pop()?.toLowerCase()
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tiff'].includes(ext))
    return ImageIcon
  if (['csv', 'tsv', 'xlsx', 'xls', 'xlsm'].includes(ext)) return Sheet
  if (['json', 'py', 'js', 'ts', 'html', 'css', 'yaml', 'yml', 'xml'].includes(ext))
    return FileCode
  return FileText
}

/* Upload phase for the whole batch (single request → all files move together). */
function ProgressBar({ value, error }) {
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-border">
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-200',
          error ? 'bg-rose-500' : 'bg-linear-to-r from-brand-600 to-brand-400'
        )}
        style={{ width: `${Math.round(value * 100)}%` }}
      />
    </div>
  )
}

export function UploadZone({ onUpload, uploading, uploadProgress, stats, perFile }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [files, setFiles] = useState([])
  const [errors, setErrors] = useState({}) // name -> message

  function addFiles(list) {
    const picked = Array.from(list)
    const errs = {}
    const ok = []
    for (const f of picked) {
      const err = validate(f)
      if (err) errs[f.name] = err
      else ok.push(f)
    }
    setErrors((prev) => ({ ...prev, ...errs }))
    if (ok.length) setFiles((prev) => dedupe([...prev, ...ok]))
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
    const name = files[idx]?.name
    setFiles((prev) => prev.filter((_, i) => i !== idx))
    if (name)
      setErrors((prev) => {
        const { [name]: _, ...rest } = prev
        return rest
      })
  }

  const errorList = Object.entries(errors)

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/15">
          <UploadCloud className="h-5 w-5 text-brand-400" />
        </span>
        <div>
          <CardTitle>Upload anything</CardTitle>
          <p className="text-xs text-muted">PDF · Office · data · images · multiple allowed</p>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        {/* Dropzone */}
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload files: drag and drop or press Enter to browse"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            if (!dragging) setDragging(true)
          }}
          onDragLeave={(e) => {
            // Ignore leave events fired when hovering child elements.
            if (e.currentTarget.contains(e.relatedTarget)) return
            setDragging(false)
          }}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            addFiles(e.dataTransfer.files)
          }}
          className={cn(
            'group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-all duration-200',
            dragging
              ? 'scale-[1.01] border-brand-400 bg-brand-500/10 shadow-[0_0_0_4px_rgba(129,140,248,0.12)]'
              : 'border-border hover:border-brand-500/60 hover:bg-brand-500/5'
          )}
        >
          <motion.div
            animate={dragging ? { scale: 1.1, y: -4 } : { scale: 1, y: 0 }}
            className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-brand-500/20 to-cyan/20"
          >
            <UploadCloud
              className={cn(
                'h-7 w-7 transition-colors',
                dragging ? 'text-brand-50' : 'text-brand-400'
              )}
            />
          </motion.div>
          <p className="text-sm font-medium text-ink">
            {dragging ? 'Drop to add files' : 'Drag & drop or click to browse'}
          </p>
          <p className="mt-1 text-xs text-muted">
            PDF, Word, Excel, CSV, JSON, images &amp; more · up to {formatBytes(MAX_FILE_BYTES)} each
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

        {/* Inline validation errors */}
        <AnimatePresence initial={false}>
          {errorList.length > 0 && (
            <motion.ul
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-1.5 overflow-hidden"
            >
              {errorList.map(([name, msg]) => (
                <li
                  key={name}
                  className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300"
                >
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span className="min-w-0">
                    <span className="font-semibold">{name}</span> — {msg}
                  </span>
                  <button
                    onClick={() =>
                      setErrors((prev) => {
                        const { [name]: _, ...rest } = prev
                        return rest
                      })
                    }
                    aria-label={`Dismiss error for ${name}`}
                    className="ml-auto shrink-0 rounded p-0.5 text-rose-300/70 hover:text-rose-200"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>

        {/* Selected file list with per-file upload progress */}
        <AnimatePresence initial={false}>
          {files.length > 0 && (
            <motion.ul
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2 overflow-hidden"
            >
              {files.map((file, idx) => {
                const Icon = fileIcon(file.name)
                return (
                  <motion.li
                    key={file.name + file.size}
                    layout
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    className="rounded-xl border border-border bg-surface/50 px-3 py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 shrink-0 text-brand-400" />
                      <span className="min-w-0 flex-1 truncate text-sm text-ink">
                        {file.name}
                      </span>
                      {uploading ? (
                        <span className="shrink-0 text-xs tabular-nums text-muted">
                          {Math.round((uploadProgress ?? 0) * 100)}%
                        </span>
                      ) : (
                        <span className="shrink-0 text-xs text-muted">
                          {formatBytes(file.size)}
                        </span>
                      )}
                      {!uploading && (
                        <button
                          onClick={() => removeFile(idx)}
                          className="rounded-md p-1 text-muted transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                          aria-label={`Remove ${file.name}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    {uploading && (
                      <div className="mt-2">
                        <ProgressBar value={uploadProgress ?? 0} />
                      </div>
                    )}
                  </motion.li>
                )
              })}
            </motion.ul>
          )}
        </AnimatePresence>

        {/* Indexing phase indicator — transfer is done, server is embedding */}
        {uploading && (uploadProgress ?? 0) >= 1 && (
          <p className="flex items-center gap-2 text-xs text-muted">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Uploaded — indexing documents…
          </p>
        )}

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

              {/* Per-file summary cards */}
              {perFile?.length > 0 && (
                <ul className="space-y-2">
                  {perFile.map((f) => (
                    <motion.li
                      key={f.name}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-3 rounded-xl border border-brand-500/20 bg-brand-500/5 px-3 py-2.5"
                    >
                      <FileText className="h-4 w-4 shrink-0 text-brand-400" />
                      <span className="min-w-0 flex-1 truncate text-sm text-ink">{f.name}</span>
                      <span className="shrink-0 text-xs text-muted">
                        {f.pages} page{f.pages === 1 ? '' : 's'} · {f.chunks} chunk
                        {f.chunks === 1 ? '' : 's'}
                      </span>
                    </motion.li>
                  ))}
                </ul>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}
