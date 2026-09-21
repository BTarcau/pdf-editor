import { useRef, useState } from 'react'
import { Button } from '../../components/Button'
import { UploadIcon } from '../../components/icons'
import { t } from '../../strings'

interface Props {
  onFile: (file: File) => void
  busy: boolean
}

/** Empty-state landing: drop target plus a file picker. */
export function DropZone({ onFile, busy }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)

  return (
    <div
      className={
        'flex w-full max-w-xl flex-col items-center gap-4 rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-colors ' +
        (over
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
          : 'border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-900')
      }
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        const file = e.dataTransfer.files[0]
        if (file) onFile(file)
      }}
    >
      <UploadIcon width={40} height={40} className="text-blue-600" />
      <div>
        <p className="text-lg font-semibold">{over ? t.dropActive : t.dropTitle}</p>
        <p className="mt-1 text-sm text-neutral-500">{t.dropOr}</p>
      </div>
      <Button variant="primary" disabled={busy} onClick={() => inputRef.current?.click()}>
        {busy ? t.opening : t.chooseFile}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        data-testid="file-input"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFile(file)
          e.target.value = ''
        }}
      />
      <p className="max-w-sm text-sm text-neutral-600 dark:text-neutral-400">{t.privacy}</p>
    </div>
  )
}
