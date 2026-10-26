import { Toast as AnimateToast } from '@animate-ui/react/primitives/base-ui/toast';
import { Check } from '@/components/animate-ui/icons/check';
import { ShieldCheck } from '@/components/animate-ui/icons/shield-check';
import { X } from '@/components/animate-ui/icons/x';
import './toast.css';

export const toastManager = AnimateToast.createToastManager();

export function Toaster() {
  const { toasts } = AnimateToast.useToastManager();

  return (
    <AnimateToast.Portal>
      <AnimateToast.Viewport className="toast-viewport">
        {toasts.map((toast) => (
          <AnimateToast.Root key={toast.id} toast={toast} className="toast-root">
            <AnimateToast.Content className="toast-content">
              <div className="toast-icon-wrapper" data-slot="toast-icon">
                {toast.type === 'success' || toast.type === undefined ? (
                  <Check size={18} className="toast-icon toast-icon--success" aria-hidden="true" />
                ) : toast.type === 'error' ? (
                  <X size={18} className="toast-icon toast-icon--error" aria-hidden="true" />
                ) : (
                  <ShieldCheck size={18} className="toast-icon" aria-hidden="true" />
                )}
              </div>
              <div className="toast-text">
                <AnimateToast.Title className="toast-title" />
                <AnimateToast.Description className="toast-description" />
              </div>
              <AnimateToast.Close className="toast-close" aria-label="Close">
                <X size={14} aria-hidden="true" />
              </AnimateToast.Close>
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

export const showToast = {
  success: (title: string, description?: string) => {
    toastManager.add({ title, description, type: 'success' });
  },
  error: (title: string, description?: string) => {
    toastManager.add({ title, description, type: 'error' });
  },
  info: (title: string, description?: string) => {
    toastManager.add({ title, description, type: 'info' });
  },
};
