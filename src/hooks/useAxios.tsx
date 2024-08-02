import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { useEffect, useState } from "react";

// Define types for the hook's state and parameters
interface UseAxiosState<T> {
  response: T | null;
  loading: boolean;
  error: string | null;
}

// Define a generic type for the hook's return value
const useAxios = <T,>(param: AxiosRequestConfig): UseAxiosState<T> => {
  // State to store the response
  const [response, setResponse] = useState<T | null>(null);

  // State to store the loading status
  const [loading, setLoading] = useState<boolean>(false);

  // State to store any error message
  const [error, setError] = useState<string | null>(null);

  // Set the base URL for axios requests
  axios.defaults.baseURL = "https://api.coingecko.com/api/v3";

  // Function to fetch data using axios
  const fetchData = async (param: AxiosRequestConfig): Promise<void> => {
    try {
      setLoading(true);
      const result: AxiosResponse<T> = await axios(param);
      setResponse(result.data);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // useEffect to call fetchData on mount and when param changes
  useEffect(() => {
    fetchData(param);
  }, [param]);

  // Return the state
  return {
    response,
    loading,
    error,
  };
};

export default useAxios;
