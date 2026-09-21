import { useEffect, useRef, useState } from 'react'
import { Button } from '../../components/Button'
import { t } from '../../strings'
import type { PendingPassword } from './useOpenPdf'

interface Props {
  pending: PendingPassword | null
  busy: boolean
  onSubmit: (password: string) => void
  onCancel: () => void
}

export function PasswordDialog({ pending, busy, onSubmit, onCancel }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const open = pending !== null

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    else if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault()
        onCancel()
      }}
      className="m-auto w-full max-w-sm rounded-xl bg-white p-6 text-neutral-900 shadow-xl backdrop:bg-black/50 dark:bg-neutral-900 dark:text-neutral-100"
    >
      {pending && (
        // Keyed so the field is emptied after every attempt.
        <PasswordForm
          key={pending.attempt}
          pending={pending}
          busy={busy}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      )}
    </dialog>
  )
}

function PasswordForm({
  pending,
  busy,
  onSubmit,
  onCancel,
}: Omit<Props, 'pending'> & { pending: PendingPassword }) {
  const [password, setPassword] = useState('')
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (password) onSubmit(password)
      }}
      className="flex flex-col gap-4"
    >
      <h2 className="text-lg font-semibold">{t.passwordTitle}</h2>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        {t.passwordBody(pending.name)}
      </p>
      <label className="flex flex-col gap-1 text-sm font-medium">
        {t.passwordLabel}
        <input
          type="password"
          autoFocus
          autoComplete="off"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-md border border-neutral-300 bg-white px-3 py-2 font-normal focus-visible:outline-2 focus-visible:outline-blue-500 dark:border-neutral-700 dark:bg-neutral-800"
        />
      </label>
      {pending.incorrect && (
        <p role="alert" className="text-sm text-red-600">
          {t.passwordWrong}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button onClick={onCancel}>{t.cancel}</Button>
        <Button type="submit" variant="primary" disabled={!password || busy}>
          {t.passwordOpen}
        </Button>
      </div>
    </form>
  )
}
