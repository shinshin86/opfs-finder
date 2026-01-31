import React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import styles from './Dialog.module.css';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, title, description, children }: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={styles.overlay} />
        <DialogPrimitive.Content className={styles.content}>
          <div className={styles.header}>
            <DialogPrimitive.Title className={styles.title}>{title}</DialogPrimitive.Title>
            <DialogPrimitive.Close asChild>
              <button className={styles.closeButton}>
                <X size={16} />
              </button>
            </DialogPrimitive.Close>
          </div>
          {description && (
            <DialogPrimitive.Description className={styles.description}>
              {description}
            </DialogPrimitive.Description>
          )}
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// Confirm dialog
interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  danger?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  danger = false,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title}>
      <p className={styles.message}>{message}</p>
      <div className={styles.actions}>
        <button className={styles.button} onClick={() => onOpenChange(false)}>
          {cancelLabel}
        </button>
        <button
          className={`${styles.button} ${danger ? styles.danger : styles.primary}`}
          onClick={() => {
            onConfirm();
            onOpenChange(false);
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}

// Input dialog (for rename, new folder, etc.)
interface InputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  onConfirm: (value: string) => void;
}

export function InputDialog({
  open,
  onOpenChange,
  title,
  label,
  defaultValue = '',
  placeholder,
  confirmLabel = 'OK',
  onConfirm,
}: InputDialogProps) {
  const [value, setValue] = React.useState(defaultValue);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setValue(defaultValue);
      // Focus input when dialog opens
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [open, defaultValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onConfirm(value.trim());
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title}>
      <form onSubmit={handleSubmit}>
        <label className={styles.label}>
          {label}
          <input
            ref={inputRef}
            type="text"
            className={styles.input}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
          />
        </label>
        <div className={styles.actions}>
          <button type="button" className={styles.button} onClick={() => onOpenChange(false)}>
            Cancel
          </button>
          <button
            type="submit"
            className={`${styles.button} ${styles.primary}`}
            disabled={!value.trim()}
          >
            {confirmLabel}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

// Conflict resolution dialog
interface ConflictDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filename: string;
  onReplace: () => void;
  onKeepBoth: () => void;
  onSkip: () => void;
}

export function ConflictDialog({
  open,
  onOpenChange,
  filename,
  onReplace,
  onKeepBoth,
  onSkip,
}: ConflictDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="File Already Exists"
      description={`"${filename}" already exists in this location.`}
    >
      <div className={styles.conflictActions}>
        <button
          className={`${styles.button} ${styles.fullWidth}`}
          onClick={() => {
            onReplace();
            onOpenChange(false);
          }}
        >
          Replace
        </button>
        <button
          className={`${styles.button} ${styles.fullWidth}`}
          onClick={() => {
            onKeepBoth();
            onOpenChange(false);
          }}
        >
          Keep Both
        </button>
        <button
          className={`${styles.button} ${styles.fullWidth}`}
          onClick={() => {
            onSkip();
            onOpenChange(false);
          }}
        >
          Skip
        </button>
      </div>
    </Dialog>
  );
}
