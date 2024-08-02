import { BrowserRouter, Route, Routes } from "react-router-dom";
import CryptoHome from "./pages/CryptoHome";
import HomePage from "./pages/Homepage";
import CryptoDetail from "./pages/CryptoDetail";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/coin/:id" element={<CryptoDetail />} />
        <Route path="/CryptoHome" element={<CryptoHome />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
