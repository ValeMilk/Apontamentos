import { useState, useCallback } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

export function useHiringForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const createHiring = useCallback(
    async (data: any) => {
      try {
        setLoading(true);
        setError('');
        const response = await axios.post(`${API_URL}/api/hirings`, data);
        return response.data;
      } catch (err: any) {
        const message = err.response?.data?.error || 'Erro ao criar ficha';
        setError(message);
        throw new Error(message);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const updateHiring = useCallback(
    async (id: string, data: any) => {
      try {
        setLoading(true);
        setError('');
        const response = await axios.put(`${API_URL}/api/hirings/${id}`, data);
        return response.data;
      } catch (err: any) {
        const message = err.response?.data?.error || 'Erro ao atualizar ficha';
        setError(message);
        throw new Error(message);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const fetchHirings = useCallback(async (filters?: any) => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (filters?.page) params.append('page', filters.page);
      if (filters?.limit) params.append('limit', filters.limit);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.supervisorId) params.append('supervisorId', filters.supervisorId);

      const response = await axios.get(`${API_URL}/api/hirings?${params.toString()}`);
      return response.data;
    } catch (err: any) {
      const message = err.response?.data?.error || 'Erro ao carregar fichas';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const getHiring = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get(`${API_URL}/api/hirings/${id}`);
      return response.data;
    } catch (err: any) {
      const message = err.response?.data?.error || 'Erro ao obter ficha';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const approveHiring = useCallback(
    async (id: string, userId: string, userRole: string) => {
      try {
        setLoading(true);
        setError('');
        const response = await axios.patch(`${API_URL}/api/hirings/${id}/approve`, {
          userId,
          userRole,
        });
        return response.data;
      } catch (err: any) {
        const message = err.response?.data?.error || 'Erro ao aprovar ficha';
        setError(message);
        throw new Error(message);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const rejectHiring = useCallback(
    async (id: string, userId: string, userRole: string, motivoRejeicao: string) => {
      try {
        setLoading(true);
        setError('');
        const response = await axios.patch(`${API_URL}/api/hirings/${id}/reject`, {
          userId,
          userRole,
          motivoRejeicao,
        });
        return response.data;
      } catch (err: any) {
        const message = err.response?.data?.error || 'Erro ao rejeitar ficha';
        setError(message);
        throw new Error(message);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const deleteHiring = useCallback(
    async (id: string, userId: string, userRole: string) => {
      try {
        setLoading(true);
        setError('');
        const response = await axios.delete(`${API_URL}/api/hirings/${id}`, {
          data: { userId, userRole },
        });
        return response.data;
      } catch (err: any) {
        const message = err.response?.data?.error || 'Erro ao deletar ficha';
        setError(message);
        throw new Error(message);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    loading,
    error,
    createHiring,
    updateHiring,
    fetchHirings,
    getHiring,
    approveHiring,
    rejectHiring,
    deleteHiring,
  };
}
