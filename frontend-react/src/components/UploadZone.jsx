import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Upload,
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
import { cn, formatBytes } from '@/lib/utils'

const ALLOWED = [
  'pdf', 'txt', 'md', 'markdown', 'csv', 'tsv', 'xlsx', 'xls', 'xlsm',
  'docx', 'json', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tiff',
  'log', 'py', 'js', 'ts', 'html', 'css', 'yaml', 'yml', 'xml',
]
const ACCEPT = ALLOWED.map((e) => `.${e}`).join(',')
const ALLOWED_RE = new RegExp(`\\.(${ALLOWED.join('|')})$`, 'i')
const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10 MB

/* Classify a picked file into pending + an optional inline error.
   Errors speak from the user's side: what happened and what to do. */
function validate(file) {
  if (!ALLOWED_RE.test(file.name)) {
    const ext = file.name.includes('.') ? file.name.split('.').pop() : ''
    return ext
      ? `NeuralDocs can't read .${ext.toLowerCase()} files. Try PDF, Word, text, CSV, JSON, or an image.`
      : 'This file has no extension — rename it to something NeuralDocs can read (e.g. .pdf, .md, .csv).'
  }
  if (file.size > MAX_FILE_BYTES) {
    return `This file is ${formatBytes(file.size)}, over the ${formatBytes(MAX_FILE_BYTES)} limit. Split it or upload a smaller excerpt.`
  }
  if (file.size === 0) return 'This file is empty — there is nothing to index.'
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
    <Card className="flex h-full flex-col self-start lg:sticky lg:top-20">
      <CardHeader>
        <Upload className="h-5 w-5 text-brand-400" aria-hidden="true" />
        <CardTitle>Add documents</CardTitle>
      </CardHeader>
      <p className="px-5 pb-4 text-sm text-muted">
        PDF, Word, Excel, CSV, text, code or an image of a page — up to 10 MB each.
      </p>

      <CardContent className="flex flex-1 flex-col gap-4">
        {/* Dropzone */}
        <div
          role="button"
          tabIndex={0}
          aria-label="Add documents: drag and drop or press Enter to browse"
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
            'flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-5 py-9 text-center transition-colors duration-150',
            dragging
              ? 'border-brand-400 bg-brand-500/10'
              : 'cursor-pointer border-border hover:border-brand-500/60'
          )}
        >
          <p className="text-sm font-medium text-ink">
            {dragging ? 'Drop them here' : 'Drag files here, or click to browse'}
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
              className="space-y-2 overflow-hidden"
              aria-live="polite"
            >
              {errorList.map(([name, msg]) => (
                <li
                  key={name}
                  className="flex items-start gap-2 rounded-md border border-error/35 bg-error/10 px-3 py-2.5 text-xs leading-relaxed text-error"
                >
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="font-mono text-2xs">{name}</span> — {msg}
                  </span>
                  <button
                    onClick={() =>
                      setErrors((prev) => {
                        const { [name]: _, ...rest } = prev
                        return rest
                      })
                    }
                    aria-label={`Dismiss error for ${name}`}
                    className="ml-auto shrink-0 rounded p-0.5 opacity-70 hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>

        {/* Selected file list with upload progress */}
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
                  <li
                    key={file.name + file.size}
                    className="rounded-md border border-border bg-bg-soft px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4 shrink-0 text-faint" aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate text-sm text-ink">
                        {file.name}
                      </span>
                      {uploading ? (
                        <span className="shrink-0 font-mono text-2xs tabular-nums text-muted">
                          {Math.round((uploadProgress ?? 0) * 100)}%
                        </span>
                      ) : (
                        <span className="shrink-0 font-mono text-2xs text-faint">
                          {formatBytes(file.size)}
                        </span>
                      )}
                      {!uploading && (
                        <button
                          onClick={() => removeFile(idx)}
                          className="rounded p-1 text-faint transition-colors hover:text-error"
                          aria-label={`Remove ${file.name}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    {uploading && (
                      <div className="mt-2 h-0.5 w-full overflow-hidden rounded-full bg-border">
                        <div
                          className="h-full rounded-full bg-brand-500 transition-[width] duration-200"
                          style={{ width: `${Math.round((uploadProgress ?? 0) * 100)}%` }}
                        />
                      </div>
                    )}
                  </li>
                )
              })}
            </motion.ul>
          )}
        </AnimatePresence>

        <Button
          className="w-full"
          disabled={files.length === 0 || uploading}
          onClick={() => onUpload(files)}
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {(uploadProgress ?? 0) >= 1 ? 'Reading documents…' : 'Uploading…'}
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" aria-hidden="true" />
              {files.length === 1
                ? 'Upload 1 document'
                : files.length > 1
                  ? `Upload ${files.length} documents`
                  : 'Choose documents'}
            </>
          )}
        </Button>

        {/* Indexing phase indicator — transfer is done, server is embedding */}
        {uploading && (uploadProgress ?? 0) >= 1 && (
          <p className="text-xs text-muted">Extracting text and indexing passages…</p>
        )}

        {/* Result summary after successful indexing */}
        <AnimatePresence>
          {stats && !uploading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3 border-t border-border pt-4"
            >
              <div className="flex items-center gap-2 text-sm text-ok">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Ready — ask a question
              </div>
              <p className="font-mono text-2xs text-faint">
                {stats.files} file{stats.files > 1 ? 's' : ''} · {stats.pages} pages ·{' '}
                {stats.chunks} passages indexed
              </p>
              {perFile?.length > 0 && (
                <ul className="space-y-1.5">
                  {perFile.map((f) => (
                    <li key={f.name} className="flex items-center gap-2 text-xs">
                      <FileText className="h-3.5 w-3.5 shrink-0 text-faint" aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate text-muted">{f.name}</span>
                      <span className="shrink-0 font-mono text-2xs text-faint">
                        {f.pages}p · {f.chunks} passages
                      </span>
                    </li>
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
