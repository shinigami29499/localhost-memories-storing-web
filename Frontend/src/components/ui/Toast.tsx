import { useLayoutEffect, useRef, useState } from 'react';
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
// Pointer capture can emit a click after a cancelled swipe.
const TOAST_CLICK_MOVE_THRESHOLD = 8;

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
      className="toast-action toast-action--undo"
      disabled={undoing}
      aria-busy={undoing}
      onClick={() => void runUndo()}
    >
      {undoing ? <LoaderCircle size={14} animate={false} className="btn__spinner" aria-hidden="true" /> : null}
      {data.undoLabel ?? t("Undo")}
    </AnimateToast.Action>
  );
}

function useToastLayer() {
  const [layer] = useState(() => {
    const element = document.createElement('div');
    element.className = 'toast-layer';
    return element;
  });

  useLayoutEffect(() => {
    const selector = typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('selector(:modal)')
      ? 'dialog:modal'
      : 'dialog[open]';
    let dialogs = Array.from(document.querySelectorAll<HTMLDialogElement>(selector));

    const placeLayer = () => {
      // Native modal dialogs are in the browser's top layer, above every z-index.
      const container = dialogs.at(-1) ?? document.body;
      if (layer.parentElement !== container || layer.nextElementSibling) {
        const focused = document.activeElement;
        const restoreFocus = focused instanceof HTMLElement && layer.contains(focused);
        container.appendChild(layer);
        if (restoreFocus) focused.focus({ preventScroll: true });
      }
    };

    const observer = new MutationObserver((mutations) => {
      let changed = false;
      for (const mutation of mutations) {
        if (mutation.type !== 'attributes' || !(mutation.target instanceof HTMLDialogElement)) continue;
        const dialog = mutation.target;
        dialogs = dialogs.filter((item) => item !== dialog);
        if (dialog.isConnected && dialog.matches(selector)) dialogs.push(dialog);
        changed = true;
      }

      const connectedDialogs = dialogs.filter((dialog) => dialog.isConnected);
      if (connectedDialogs.length !== dialogs.length) {
        dialogs = connectedDialogs;
        changed = true;
      }
      if (changed || layer.nextElementSibling) placeLayer();
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['open'],
      childList: true,
      subtree: true,
    });
    placeLayer();

    return () => {
      observer.disconnect();
      layer.remove();
    };
  }, [layer]);

  return layer;
}

function isInteractiveToastTarget(target: EventTarget | null) {
  const element = target instanceof Element ? target : target instanceof Node ? target.parentElement : null;
  return element?.closest('button, a, input, select, textarea, [role="button"], [role="link"]') != null;
}

export function Toaster() {
  const { t } = useLocale();
  const { toasts } = AnimateToast.useToastManager<ToastData>();
  const layer = useToastLayer();
  const pointers = useRef(new WeakMap<HTMLDivElement, {
    pointerId: number;
    x: number;
    y: number;
    moved: boolean;
    startedOnControl: boolean;
  }>());

  return (
    <AnimateToast.Portal container={layer}>
      <AnimateToast.Viewport className="toast-viewport">
        {toasts.map((toast) => (
          <AnimateToast.Root
            key={toast.id}
            toast={toast}
            className="toast-root"
            onPointerDown={(event) => {
              if (event.button !== 0) return;
              pointers.current.set(event.currentTarget, {
                pointerId: event.pointerId,
                x: event.clientX,
                y: event.clientY,
                moved: false,
                startedOnControl: isInteractiveToastTarget(event.target),
              });
            }}
            onPointerMove={(event) => {
              const start = pointers.current.get(event.currentTarget);
              if (start?.pointerId === event.pointerId
                && Math.hypot(event.clientX - start.x, event.clientY - start.y) > TOAST_CLICK_MOVE_THRESHOLD) {
                start.moved = true;
              }
            }}
            onPointerCancel={(event) => {
              const start = pointers.current.get(event.currentTarget);
              if (start?.pointerId === event.pointerId) start.moved = true;
            }}
            onClick={(event) => {
              const start = pointers.current.get(event.currentTarget);
              pointers.current.delete(event.currentTarget);
              if (isInteractiveToastTarget(event.target)) return;
              if (event.detail !== 0 && start && (
                start.startedOnControl || start.moved
                || Math.hypot(event.clientX - start.x, event.clientY - start.y) > TOAST_CLICK_MOVE_THRESHOLD
              )) return;
              toastManager.close(toast.id);
            }}
          >
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
