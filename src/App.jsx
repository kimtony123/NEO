import { BrowserRouter, Route, Routes } from "react-router-dom";
import CryptoHome from "./pages/CryptoHome";
import HomePage from "./pages/Homepage";
import CryptoDetail from "./pages/CryptoDetail";
import Navbar from "./components/shared/Navbar";
import NeoHedgeFund from "./pages/neoHedgeFund";
import AoHomeOne from "./pages/AoHomeOne";

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/coin/:id" element={<CryptoDetail />} />
        <Route path="/CryptoHome" element={<CryptoHome />} />
        <Route path="/neoHedgeFund" element={<NeoHedgeFund />} />
        <Route path="/AoHomeOne" element={<AoHomeOne />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
