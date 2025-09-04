const EmptyState = ({ 
  icon, 
  title, 
  description, 
  action, 
  actionText,
  className = "" 
}) => {
  return (
    <div className={`text-center py-12 ${className}`}>
      <div className="text-6xl mb-4 opacity-60">{icon}</div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-white/60 mb-6 max-w-md mx-auto">{description}</p>
      {action && actionText && (
        <button
          onClick={action}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
