import { Route, Routes } from "react-router-dom";
import CustomerApp from "./CustomerApp";
import OwnerApp from "./OwnerApp";

export default function App() {
  return (
    <Routes>
      <Route path="/owner/*" element={<OwnerApp />} />
      <Route path="*" element={<CustomerApp />} />
    </Routes>
  );
}
