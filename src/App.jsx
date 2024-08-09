import { BrowserRouter, Route, Routes } from "react-router-dom";
import CryptoHome from "./pages/CryptoHome";
import HomePage from "./pages/Homepage";
import CryptoDetail from "./pages/CryptoDetail";
import Navbar from "./components/shared/Navbar";
import AoHome from "./pages/AoHome";
import AoHomeOne from "./pages/AoHomeOne";

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/coin/:id" element={<CryptoDetail />} />
        <Route path="/CryptoHome" element={<CryptoHome />} />
        <Route path="/AoHome" element={<AoHome />} />
        <Route path="/AoHomeOne" element={<AoHomeOne />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
