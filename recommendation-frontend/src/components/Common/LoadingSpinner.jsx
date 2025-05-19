const LoadingSpinner = ({ text = "Loading..." }) => {
  return (
    <div className="flex flex-col items-center justify-center p-6 md:p-8 text-gray-400">
      <div className="spinner mb-3 md:mb-4 w-6 h-6 md:w-8 md:h-8"></div>
      <p className="text-sm md:text-base">{text}</p>
    </div>
  );
};
export default LoadingSpinner;
