// src/pages/TablePage.jsx
import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTable } from "../context/TableContext";

function TablePage() {
  const { tableId } = useParams();   // 👈 get the ID from the URL
  const { setTableId } = useTable(); // 👈 update global context
  const navigate = useNavigate();

  useEffect(() => {
    if (tableId) {
      setTableId(tableId);
      navigate("/", { replace: true });
    }
  }, [tableId, setTableId, navigate]);

  return null;
}

export default TablePage;
