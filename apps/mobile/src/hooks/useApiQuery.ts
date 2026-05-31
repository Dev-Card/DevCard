import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';

// ── Generic API Query Hook ────────────────────────────────────────────────────
// Reduces boilerplate across screens: replaces repeated useState + useEffect +
// useCallback patterns with a single hook call.

interface UseApiQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseApiQueryOptions {
  /** Skip the initial fetch (useful for conditional queries) */
  skip?: boolean;
}

export function useApiQuery<T>(
  path: string,
  options: UseApiQueryOptions = {},
): UseApiQueryResult<T> {
  const { token, logout } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!options.skip);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await apiRequest<T>(path, {
        method: 'GET',
        token,
        onUnauthorized: logout,
      });
      setData(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Request failed';
      setError(message);
      console.error(`useApiQuery(${path}):`, message);
    } finally {
      setLoading(false);
    }
  }, [path, token, logout]);

  useEffect(() => {
    if (!options.skip) {
      fetchData();
    }
  }, [fetchData, options.skip]);

  return { data, loading, error, refetch: fetchData };
}
