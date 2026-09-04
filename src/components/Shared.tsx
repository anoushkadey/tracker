import { createContext, useContext, useState, ReactNode } from 'react'

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  duration?: number
}

interface ToastContextType {
  toasts: Toast[]
  push: (message: string, type?: Toast['type'], duration?: number) => void
  remove: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const push = (message: string, type: Toast['type'] = 'info', duration = 3000) => {
    const id = `toast-${Date.now()}-${Math.random()}`
    const toast: Toast = { id, message, type, duration }

    setToasts((prev) => [...prev, toast])

    if (duration > 0) {
      setTimeout(() => {
        remove(id)
      }, duration)
    }
  }

  const remove = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ toasts, push, remove }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={remove} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

/**
 * Toast container that renders all active toasts
 */
function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  return (
    <div className="fixed bottom-4 right-4 space-y-2 z-50 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white text-sm animate-in fade-in slide-in-from-right-4 duration-300 ${getToastStyles(
            toast.type
          )}`}
        >
          <span>{getToastIcon(toast.type)}</span>
          <p className="flex-1">{toast.message}</p>
          <button
            onClick={() => onRemove(toast.id)}
            className="text-white/70 hover:text-white transition"
            aria-label="Close notification"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}

function getToastStyles(type: Toast['type']): string {
  const styles: Record<Toast['type'], string> = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    warning: 'bg-yellow-500',
  }
  return styles[type] || styles.info
}

function getToastIcon(type: Toast['type']): string {
  const icons: Record<Toast['type'], string> = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠',
  }
  return icons[type] || icons.info
}

/**
 * Reusable button component (used throughout the app)
 */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost'
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  const baseStyles =
    'px-4 py-2 rounded font-medium transition disabled:opacity-50 disabled:cursor-not-allowed'
  const variantStyles: Record<string, string> = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
    ghost: 'text-gray-700 hover:bg-gray-100',
  }

  return (
    <button className={`${baseStyles} ${variantStyles[variant]} ${className}`} {...props} />
  )
}

/**
 * Reusable card component for layout
 */
export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>{children}</div>
}

/**
 * Reusable input component
 */
export function Input({
  className = '',
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
      {...props}
    />
  )
}

/**
 * Reusable select component
 */
export function Select({
  className = '',
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
      {...props}
    />
  )
}
