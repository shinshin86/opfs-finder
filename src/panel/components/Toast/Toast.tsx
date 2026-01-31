import React, { useEffect } from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import {
  X,
  CheckCircle,
  AlertCircle,
  Info,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useToastStore } from '../../store';
import type { Toast as ToastType, ToastType as ToastTypeEnum } from '../../../shared/types';
import styles from './Toast.module.css';

const iconMap: Record<ToastTypeEnum, React.ReactNode> = {
  success: <CheckCircle size={18} />,
  error: <AlertCircle size={18} />,
  warning: <AlertTriangle size={18} />,
  info: <Info size={18} />,
};

function ToastItem({ toast }: { toast: ToastType }) {
  const { removeToast } = useToastStore();
  const [showDetails, setShowDetails] = React.useState(false);

  useEffect(() => {
    if (toast.duration !== 0) {
      const timer = setTimeout(() => {
        removeToast(toast.id);
      }, toast.duration || 5000);
      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.duration, removeToast]);

  return (
    <ToastPrimitive.Root className={`${styles.toast} ${styles[toast.type]}`}>
      <div className={styles.icon}>{iconMap[toast.type]}</div>
      <div className={styles.content}>
        <ToastPrimitive.Title className={styles.title}>{toast.title}</ToastPrimitive.Title>
        {toast.message && (
          <ToastPrimitive.Description className={styles.message}>
            {toast.message}
          </ToastPrimitive.Description>
        )}
        {toast.details && (
          <>
            <button className={styles.detailsToggle} onClick={() => setShowDetails(!showDetails)}>
              {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              <span>Details</span>
            </button>
            {showDetails && <pre className={styles.details}>{toast.details}</pre>}
          </>
        )}
      </div>
      <ToastPrimitive.Close asChild>
        <button className={styles.close} onClick={() => removeToast(toast.id)}>
          <X size={14} />
        </button>
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { toasts } = useToastStore();

  return (
    <ToastPrimitive.Provider swipeDirection="right">
      {children}
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
      <ToastPrimitive.Viewport className={styles.viewport} />
    </ToastPrimitive.Provider>
  );
}
