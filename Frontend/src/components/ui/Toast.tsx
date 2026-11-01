import { startTransition, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Toast as AnimateToast } from '@animate-ui/react/primitives/base-ui/toast';
import { AnimateIcon } from '@/components/animate-ui/icons/icon';
import { CalendarCheck } from '@/components/animate-ui/icons/calendar-check';
import { Check } from '@/components/animate-ui/icons/check';
import { LoaderCircle } from '@/components/animate-ui/icons/loader-circle';
import { ShieldCheck } from '@/components/animate-ui/icons/shield-check';
import { X } from '@/components/animate-ui/icons/x';
import './toast.css';
import { useLocale } from "../../context/LocaleContext";

export type ToastUndoHandler = () => void | Promise<void>;

export interface ToastOptions {
  id?: string;
  description?: string;
  /** Adds an undo button to the toast; the toast reports whether the handler succeeded. */
  undo?: ToastUndoHandler;
  undoLabel?: string;
  timeout?: number;
  progress?: boolean;
  onClick?: () => void;
  highlight?: string[];
  icon?: 'calendar-check';
}

interface ToastData {
  undo?: ToastUndoHandler;
  undoLabel?: string;
  progress?: boolean;
  onClick?: () => void;
  highlight?: string[];
  icon?: 'calendar-check';
}

/** Undoable toasts stay longer because the user has to decide before they close. */
const UNDOABLE_TOAST_TIMEOUT = 10000;
// Pointer capture can emit a click after a cancelled swipe.
const TOAST_CLICK_MOVE_THRESHOLD = 8;

export const toastManager = AnimateToast.createToastManager();

function normalizeToastMessage(message: string) {
  return message.trim().replace(/[.!?…]+$/u, '').trim().toLocaleLowerCase();
}

function addToast(type: 'success' | 'error' | 'info' | 'warning' | 'delete', title: string, details?: string | ToastOptions) {
  const options: ToastOptions = typeof details === 'string' ? { description: details } : details ?? {};
  return toastManager.add<ToastData>({
    id: options.id,
    title,
    description: options.description && normalizeToastMessage(options.description) !== normalizeToastMessage(title)
      ? options.description
      : undefined,
    type,
    timeout: options.timeout ?? (options.undo ? UNDOABLE_TOAST_TIMEOUT : undefined),
    data: options.undo || options.progress || options.onClick || options.highlight?.length || options.icon
      ? { undo: options.undo, undoLabel: options.undoLabel, progress: options.progress, onClick: options.onClick, highlight: options.highlight, icon: options.icon }
      : undefined,
  });
}

function highlightedTitle(title: string, names: string[]) {
  const parts: React.ReactNode[] = [];
  let offset = 0;
  while (offset < title.length) {
    const match = names.filter(Boolean).map((name) => ({ name, index: title.indexOf(name, offset) }))
      .filter((entry) => entry.index >= 0).sort((a, b) => a.index - b.index || b.name.length - a.name.length)[0];
    if (!match) { parts.push(title.slice(offset)); break; }
    if (match.index > offset) parts.push(title.slice(offset, match.index));
    parts.push(<strong key={match.index}>{match.name}</strong>);
    offset = match.index + match.name.length;
  }
  return parts;
}

export const showToast = {
  success: (title: string, details?: string | ToastOptions) => addToast('success', title, details),
  error: (title: string, details?: string | ToastOptions) => addToast('error', title, details),
  info: (title: string, details?: string | ToastOptions) => addToast('info', title, details),
  warning: (title: string, details?: string | ToastOptions) => addToast('warning', title, details),
  delete: (title: string, details?: string | ToastOptions) => addToast('delete', title, details),
  dismiss: (toastId?: string) => toastManager.close(toastId),
};

function activateToast(toastId: string, onClick?: () => void) {
  if (!onClick) { toastManager.close(toastId); return; }
  flushSync(() => toastManager.close(toastId));
  startTransition(onClick);
}

function ToastUndoButton({ toastId, data }: { toastId: string; data: ToastData }) {
  const { t } = useLocale();
  const [undoing, setUndoing] = useState(false);

  const runUndo = async () => {
    if (undoing) return;
    setUndoing(true);
    try {
      await data.undo?.();
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
            data-toast-type={toast.type}
            data-presence-progress={toast.data?.progress ? toast.type : undefined}
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
              activateToast(toast.id, toast.data?.onClick);
            }}
          >
            <AnimateToast.Content className="toast-content">
              <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
                <div className="toast-icon-wrapper" data-slot="toast-icon">
                  {toast.data?.icon === 'calendar-check' ? (
                    <CalendarCheck size={18} className="toast-icon toast-icon--check-in" aria-hidden="true" />
                  ) : toast.type === 'success' || toast.type === undefined ? (
                    <Check size={18} className="toast-icon toast-icon--success" aria-hidden="true" />
                  ) : toast.type === 'error' || toast.type === 'delete' ? (
                    <X size={18} className="toast-icon toast-icon--error" aria-hidden="true" />
                  ) : (
                    <ShieldCheck size={18} className="toast-icon" aria-hidden="true" />
                  )}
                </div>
              </AnimateIcon>
              <div className="toast-text">
                {toast.data?.onClick ? (
                  <button type="button" className="toast-link" onClick={() => activateToast(toast.id, toast.data?.onClick)}>
                    <AnimateToast.Title className="toast-title">{typeof toast.title === 'string' && toast.data?.highlight ? highlightedTitle(toast.title, toast.data.highlight) : toast.title}</AnimateToast.Title>
                    <AnimateToast.Description className="toast-description">{typeof toast.description === 'string' && toast.data?.highlight ? highlightedTitle(toast.description, toast.data.highlight) : toast.description}</AnimateToast.Description>
                  </button>
                ) : <><AnimateToast.Title className="toast-title">{typeof toast.title === 'string' && toast.data?.highlight ? highlightedTitle(toast.title, toast.data.highlight) : toast.title}</AnimateToast.Title><AnimateToast.Description className="toast-description">{typeof toast.description === 'string' && toast.data?.highlight ? highlightedTitle(toast.description, toast.data.highlight) : toast.description}</AnimateToast.Description></>}
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
