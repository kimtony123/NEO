import HistoryChart from "../components/HistoryChart";
import CoinDetail from "../components/CoinDetail";

const CryptoDetail = () => {
  return (
    <div className="wrapper-container mt-10">
      <HistoryChart />
      <CoinDetail />
    </div>
  );
};

export default CryptoDetail;
