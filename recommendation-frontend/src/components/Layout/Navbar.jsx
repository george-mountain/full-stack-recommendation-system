import { useAuth } from "../../contexts/AuthContext";
import { useAppContext } from "../../contexts/AppContext";
import FilmIcon from "../Icons/FilmIcon";
import UserIcon from "../Icons/UserIcon";
import LockIcon from "../Icons/LockIcon";
import HomeIcon from "../Icons/HomeIcon";
import ThumbsUpIcon from "../Icons/ThumbsUpIcon";
import SettingsIcon from "../Icons/SettingsIcon";
import LogOutIcon from "../Icons/LogOutIcon";
import MenuIcon from "../Icons/MenuIcon";
import XIcon from "../Icons/XIcon";

const APP_NAME = import.meta.env.VITE_APP_NAME || "MovieRecs";

const navLinkBase =
  "px-3 py-2 sm:px-4 sm:py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center";
const navLinkHover = "hover:bg-gray-700 hover:text-white";
const navLinkActive = "bg-indigo-600 text-white";

const Navbar = ({ onLogout }) => {
  const { isAuthenticated, isAdmin, currentUser } = useAuth();
  const { currentPage, navigateTo, isMobileMenuOpen, setIsMobileMenuOpen } =
    useAppContext();

  const navItems = [
    {
      name: "Home",
      page: "home",
      icon: <HomeIcon className="w-5 h-5" />,
      requiresAuth: false,
    },
    {
      name: "Recommendations",
      page: "recommendations",
      icon: <ThumbsUpIcon className="w-5 h-5" />,
      requiresAuth: true,
    },
    {
      name: "Admin",
      page: "admin",
      icon: <SettingsIcon className="w-5 h-5" />,
      requiresAuth: true,
      requiresAdmin: true,
    },
  ];

  const handleNav = (page) => {
    navigateTo(page);
  };

  const NavLink = ({ page, children }) => (
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        handleNav(page);
      }}
      className={`${navLinkBase} ${currentPage === page ? navLinkActive : "text-gray-300 " + navLinkHover}`}
    >
      {children}
    </a>
  );

  const MobileNavLink = ({ page, children }) => (
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        handleNav(page);
      }}
      className={`nav-link text-gray-300 hover:bg-gray-700 w-full max-w-xs justify-center text-lg py-3 px-4 rounded-md flex items-center my-1 ${currentPage === page ? "active bg-indigo-600 text-white" : ""}`}
    >
      {children}
    </a>
  );

  return (
    <nav className="bg-gray-800 shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                handleNav("home");
              }}
              className="flex items-center text-white text-xl font-bold"
            >
              <FilmIcon className="w-7 h-7 text-indigo-400" />
              <span className="ml-2 hidden sm:block">{APP_NAME}</span>
            </a>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              if (item.requiresAuth && !isAuthenticated) return null;
              if (item.requiresAdmin && !isAdmin) return null;
              return (
                <NavLink key={item.page} page={item.page}>
                  {item.icon}
                  <span className="ml-1.5">{item.name}</span>
                </NavLink>
              );
            })}
          </div>

          <div className="flex items-center">
            {/* Desktop Auth Links */}
            <div className="hidden md:flex items-center space-x-3">
              {isAuthenticated ? (
                <>
                  <span className="text-gray-300 text-sm">
                    Hi, {currentUser?.email?.split("@")[0] || "User"}!
                  </span>
                  <button
                    onClick={onLogout}
                    className={`${navLinkBase} text-gray-300 ${navLinkHover} hover:bg-red-700`}
                  >
                    <LogOutIcon className="w-5 h-5" />
                    <span className="ml-1.5">Logout</span>
                  </button>
                </>
              ) : (
                <div className="flex space-x-1">
                  <NavLink page="login">
                    <UserIcon className="w-5 h-5" />
                    <span className="ml-1.5">Login</span>
                  </NavLink>
                  <NavLink page="register">
                    <LockIcon className="w-5 h-5" />
                    <span className="ml-1.5">Register</span>
                  </NavLink>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-gray-300 hover:text-white focus:outline-none p-2"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? (
                  <XIcon className="w-6 h-6" />
                ) : (
                  <MenuIcon className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="mobile-menu md:hidden fixed inset-0 bg-gray-900 bg-opacity-95 z-40 pt-16 flex flex-col items-center">
          {" "}
          {/* Apply .mobile-menu styles if needed */}
          <div className="pt-2 pb-3 space-y-1 px-2 flex flex-col items-center w-full">
            {navItems.map((item) => {
              if (item.requiresAuth && !isAuthenticated) return null;
              if (item.requiresAdmin && !isAdmin) return null;
              return (
                <MobileNavLink key={item.page} page={item.page}>
                  {item.icon}
                  <span className="ml-2">{item.name}</span>
                </MobileNavLink>
              );
            })}
            {isAuthenticated ? (
              <>
                <span className="text-gray-400 text-sm py-3 block">
                  Logged in as: {currentUser?.email}
                </span>
                <button
                  onClick={() => {
                    onLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="nav-link text-gray-300 hover:bg-red-700 hover:text-white w-full max-w-xs justify-center text-lg py-3 px-4 rounded-md flex items-center my-1"
                >
                  <LogOutIcon className="w-5 h-5" />{" "}
                  <span className="ml-2">Logout</span>
                </button>
              </>
            ) : (
              <>
                <MobileNavLink page="login">
                  <UserIcon className="w-5 h-5" />{" "}
                  <span className="ml-2">Login</span>
                </MobileNavLink>
                <MobileNavLink page="register">
                  <LockIcon className="w-5 h-5" />{" "}
                  <span className="ml-2">Register</span>
                </MobileNavLink>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
export default Navbar;
