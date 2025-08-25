import React, { createContext, useContext, useState, useEffect } from "react";

const TableContext = createContext();

export const TableProvider = ({ children }) => {
  const [tableId, setTableId] = useState(() => {
    // Load from sessionStorage on init
    return sessionStorage.getItem("tableId") || null;
  });

  useEffect(() => {
    if (tableId) {
      sessionStorage.setItem("tableId", tableId);
    } else {
      sessionStorage.removeItem("tableId");
    }
  }, [tableId]);

  return (
    <TableContext.Provider value={{ tableId, setTableId }}>
      {children}
    </TableContext.Provider>
  );
};

// Custom hook for easy access
export const useTable = () => useContext(TableContext);
