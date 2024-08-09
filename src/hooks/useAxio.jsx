import axios from "axios";
import { useEffect, useState } from "react";

const useAxios = (param) => {
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  axios.defaults.baseURL =
    "https://api.openweathermap.org/data/2.5/weather?q=London,uk&appid=a2f4db644e9107746535b0d2ca43b85d";

  const fetchData = async (param) => {
    try {
      setLoading(true);
      const result = await axios(param);
      setResponse(result.data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(param);
  }, []);

  return {
    response,
    loading,
    error,
  };
};

export default useAxios;
