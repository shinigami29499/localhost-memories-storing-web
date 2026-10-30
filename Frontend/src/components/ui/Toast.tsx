import { useState } from 'react';
import { Toast as AnimateToast } from '@animate-ui/react/primitives/base-ui/toast';
import { AnimateIcon } from '@/components/animate-ui/icons/icon';
import { Check } from '@/components/animate-ui/icons/check';
import { LoaderCircle } from '@/components/animate-ui/icons/loader-circle';
import { ShieldCheck } from '@/components/animate-ui/icons/shield-check';
import { X } from '@/components/animate-ui/icons/x';
import './toast.css';
import { useLocale } from "../../context/LocaleContext";

export type ToastUndoHandler = () => void | Promise<void>;

export interface ToastOptions {
  description?: string;
  /** Adds an undo button to the toast; the toast reports whether the handler succeeded. */
  undo?: ToastUndoHandler;
  undoLabel?: string;
  timeout?: number;
}

interface ToastData {
  undo: ToastUndoHandler;
  undoLabel?: string;
}

/** Undoable toasts stay longer because the user has to decide before they close. */
const UNDOABLE_TOAST_TIMEOUT = 10000;

export const toastManager = AnimateToast.createToastManager();

function addToast(type: 'success' | 'error' | 'info', title: string, details?: string | ToastOptions) {
  const options: ToastOptions = typeof details === 'string' ? { description: details } : details ?? {};
  return toastManager.add<ToastData>({
    title,
    description: options.description,
    type,
    timeout: options.timeout ?? (options.undo ? UNDOABLE_TOAST_TIMEOUT : undefined),
    data: options.undo ? { undo: options.undo, undoLabel: options.undoLabel } : undefined,
  });
}

export const showToast = {
  success: (title: string, details?: string | ToastOptions) => addToast('success', title, details),
  error: (title: string, details?: string | ToastOptions) => addToast('error', title, details),
  info: (title: string, details?: string | ToastOptions) => addToast('info', title, details),
  dismiss: (toastId?: string) => toastManager.close(toastId),
};

function ToastUndoButton({ toastId, data }: { toastId: string; data: ToastData }) {
  const { t } = useLocale();
  const [undoing, setUndoing] = useState(false);

  const runUndo = async () => {
    if (undoing) return;
    setUndoing(true);
    try {
      await data.undo();
      toastManager.close(toastId);
      showToast.success(t("Change undone"));
    } catch (error) {
      toastManager.close(toastId);
      showToast.error(t("Could not undo this action."), error instanceof Error ? error.message : undefined);
    } finally {
      setUndoing(false);
    }
  };

  return (
    <AnimateToast.Action
      className="toast-action"
      disabled={undoing}
      aria-busy={undoing}
      onClick={() => void runUndo()}
    >
      {undoing ? <LoaderCircle size={14} animate={false} className="btn__spinner" aria-hidden="true" /> : null}
      {data.undoLabel ?? t("Undo")}
    </AnimateToast.Action>
  );
}

export function Toaster() {
  const { t } = useLocale();
  const { toasts } = AnimateToast.useToastManager<ToastData>();

  return (
    <AnimateToast.Portal>
      <AnimateToast.Viewport className="toast-viewport">
        {toasts.map((toast) => (
          <AnimateToast.Root key={toast.id} toast={toast} className="toast-root">
            <AnimateToast.Content className="toast-content">
              <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
                <div className="toast-icon-wrapper" data-slot="toast-icon">
                  {toast.type === 'success' || toast.type === undefined ? (
                    <Check size={18} className="toast-icon toast-icon--success" aria-hidden="true" />
                  ) : toast.type === 'error' ? (
                    <X size={18} className="toast-icon toast-icon--error" aria-hidden="true" />
                  ) : (
                    <ShieldCheck size={18} className="toast-icon" aria-hidden="true" />
                  )}
                </div>
              </AnimateIcon>
              <div className="toast-text">
                <AnimateToast.Title className="toast-title" />
                <AnimateToast.Description className="toast-description" />
                {toast.data?.undo ? <ToastUndoButton toastId={toast.id} data={toast.data} /> : null}
              </div>
              <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
                <AnimateToast.Close className="toast-close" aria-label={t("Close")}>
                  <X size={14} aria-hidden="true" />
                </AnimateToast.Close>
              </AnimateIcon>
            </AnimateToast.Content>
          </AnimateToast.Root>
        ))}
      </AnimateToast.Viewport>
    </AnimateToast.Portal>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <AnimateToast.Provider toastManager={toastManager}>
      {children}
      <Toaster />
    </AnimateToast.Provider>
  );
}
