import { useCallback, useState } from 'react'

export interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'default'
  hideCancel?: boolean
}

interface ConfirmState extends ConfirmOptions {
  resolve: (value: boolean) => void
}

/**
 * Hook that provides a promise-based `confirm()` replacement.
 * Returns `[confirm, dialogProps]` — spread `dialogProps` onto `<ConfirmDialog>`.
 */
export function useConfirm() {
  const [state, setState] = useState<ConfirmState | null>(null)

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setState({ ...options, resolve })
    })
  }, [])

  const dialogProps = {
    isOpen: state !== null,
    title: state?.title ?? '',
    message: state?.message ?? '',
    confirmLabel: state?.confirmLabel,
    cancelLabel: state?.cancelLabel,
    variant: state?.variant,
    hideCancel: state?.hideCancel,
    onConfirm: () => {
      state?.resolve(true)
      setState(null)
    },
    onCancel: () => {
      state?.resolve(false)
      setState(null)
    },
  }

  return [confirm, dialogProps] as const
}
