import React, { createContext, useState, useCallback, useContext } from "react";

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [currentPage, setCurrentPage] = useState("home");
  const [selectedMovieId, setSelectedMovieId] = useState(null);
  const [previousPageInfo, setPreviousPageInfo] = useState({
    page: "home",
    movieId: null,
  });
  const [globalMessage, setGlobalMessage] = useState({ text: "", type: "" });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigateTo = useCallback(
    (page, movieId = null) => {
      if (
        page !== currentPage ||
        (page === "movieDetail" && movieId !== selectedMovieId)
      ) {
        setPreviousPageInfo({ page: currentPage, movieId: selectedMovieId });
      }
      setCurrentPage(page);
      setSelectedMovieId(movieId);
      setIsMobileMenuOpen(false);
      window.scrollTo(0, 0);
    },
    [currentPage, selectedMovieId],
  );

  const showGlobalMessage = (text, type, duration = 3000) => {
    setGlobalMessage({ text, type });
    setTimeout(() => setGlobalMessage({ text: "", type: "" }), duration);
  };

  return (
    <AppContext.Provider
      value={{
        currentPage,
        navigateTo,
        selectedMovieId,
        previousPageInfo,
        globalMessage,
        showGlobalMessage,
        isMobileMenuOpen,
        setIsMobileMenuOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
