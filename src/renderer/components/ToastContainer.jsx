import { useToast } from '../context/ToastContext';

const Toast = ({ toast, onRemove }) => {
  const getToastStyles = (type) => {
    const baseStyles = "flex items-center p-4 rounded-lg shadow-lg border transition-all duration-300 transform bg-gray-900/90 backdrop-blur-md";
    // bg-gray-900/90 and backdrop-blur-md ensure visibility
    switch (type) {
      case 'success':
        return `${baseStyles} border-green-500/50 text-green-300`;
      case 'error':
        return `${baseStyles} border-red-500/50 text-red-300`;
      case 'warning':
        return `${baseStyles} border-yellow-500/50 text-yellow-300`;
      default:
        return `${baseStyles} border-blue-500/50 text-blue-300`;
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      default:
        return 'ℹ️';
    }
  };

  return (
    <div className={getToastStyles(toast.type)}>
      <span className="text-lg mr-3">{getIcon(toast.type)}</span>
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className="ml-3 text-white/60 hover:text-white transition-colors"
      >
        ✕
      </button>
    </div>
  );
};

export const ToastContainer = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 w-80">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          toast={toast}
          onRemove={removeToast}
        />
      ))}
    </div>
  );
};
