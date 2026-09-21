import { useToastStore } from './toastStore'

export function Toast() {
  const toast = useToastStore((s) => s.toast)
  const dismiss = useToastStore((s) => s.dismiss)
  if (!toast) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-auto flex max-w-md items-center gap-4 rounded-lg bg-neutral-900 px-4 py-3 text-sm text-white shadow-lg dark:bg-neutral-100 dark:text-neutral-900"
      >
        <span>{toast.message}</span>
        {toast.action && (
          <button
            type="button"
            className="font-semibold text-blue-300 hover:underline focus-visible:outline-2 focus-visible:outline-blue-400 dark:text-blue-700"
            onClick={() => {
              toast.action?.onClick()
              dismiss()
            }}
          >
            {toast.action.label}
          </button>
        )}
      </div>
    </div>
  )
}
