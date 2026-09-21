import { useToastStore } from '../../components/toastStore'
import { useDocStore } from '../../core/store/docStore'
import { t } from '../../strings'

/** Deletes pages and reports the outcome; deletion is always undoable from the toast. */
export function deletePagesWithFeedback(ids: readonly string[]): void {
  const { deletePages, undo } = useDocStore.getState()
  const result = deletePages(ids)
  const toast = useToastStore.getState()
  if (result === 'ok') {
    toast.show(t.deleted(ids.length), { label: t.undo, onClick: undo })
  } else if (result === 'would-empty') {
    toast.show(t.cannotDeleteAll)
  }
}
