const MessageBox = ({ message, type, onDismiss }) => {
  if (!message) return null;

  const baseClasses =
    "fixed top-5 right-5 text-white p-3 md:p-4 rounded-lg shadow-xl flex items-center z-[100] text-sm md:text-base";
  const typeClasses =
    type === "error"
      ? "bg-red-600"
      : type === "success"
        ? "bg-green-600"
        : "bg-blue-600";

  return (
    <div className={`${baseClasses} ${typeClasses}`}>
      <span className="flex-grow mr-2">{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="ml-2 md:ml-4 text-lg md:text-xl font-bold hover:text-gray-200 focus:outline-none"
          aria-label="Close message"
        >
          &times;
        </button>
      )}
    </div>
  );
};
export default MessageBox;
