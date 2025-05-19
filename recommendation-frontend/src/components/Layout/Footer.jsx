const APP_NAME = import.meta.env.VITE_APP_NAME || "MovieRecs";

const Footer = () => {
  return (
    <footer className="bg-gray-800 text-gray-400 text-center p-4 sm:p-6 border-t border-gray-700">
      <p className="text-sm">
        © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
      </p>
      <p className="text-xs mt-1">Developed by George Mountain</p>
    </footer>
  );
};
export default Footer;
