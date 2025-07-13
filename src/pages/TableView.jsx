import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

const TableViewPage = () => {
  const { tableId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (tableId) {
      localStorage.setItem("tableId", tableId);
      navigate("/", { replace: true });
    }
  }, [tableId, navigate]);

  return null;
};

export default TableViewPage;
