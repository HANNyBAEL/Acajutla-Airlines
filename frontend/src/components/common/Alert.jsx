import { FiCheckCircle, FiAlertCircle, FiInfo, FiXCircle, FiX } from 'react-icons/fi';

const Alert = ({ type = 'info', title, message, onClose, children }) => {
  const config = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      icon: <FiCheckCircle className="text-green-500" size={20} />,
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: <FiXCircle className="text-red-500" size={20} />,
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      icon: <FiAlertCircle className="text-yellow-500" size={20} />,
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      icon: <FiInfo className="text-blue-500" size={20} />,
    },
  };

  const c = config[type];

  return (
    <div className={`${c.bg} ${c.border} border rounded-lg p-4 ${c.text}`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-0.5">{c.icon}</div>
        <div className="flex-1">
          {title && <h4 className="font-semibold mb-1">{title}</h4>}
          {message && <p className="text-sm">{message}</p>}
          {children}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 hover:opacity-70 transition-opacity"
          >
            <FiX size={18} />
          </button>
        )}
      </div>
    </div>
  );
};

export default Alert;