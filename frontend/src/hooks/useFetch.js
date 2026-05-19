import { useState, useCallback } from 'react';
import api from '../utils/api';

export const useFetch = (url, options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch = useCallback(
    async (params = {}) => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(url, { params });
        setData(response.data.data);
        return response.data.data;
      } catch (err) {
        setError(err.response?.data?.message || 'Error fetching data');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [url]
  );

  return { data, loading, error, fetch };
};
