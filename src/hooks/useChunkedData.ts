import { useState, useCallback, useEffect } from 'react';
import { dataStorage, DatasetInfo } from '@/utils/dataStorage';

export interface ChunkedDataState {
  datasetInfo: DatasetInfo | null;
  currentData: any[];
  loading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  pageSize: number;
}

export const useChunkedData = (initialPageSize: number = 50) => {
  const [state, setState] = useState<ChunkedDataState>({
    datasetInfo: null,
    currentData: [],
    loading: false,
    error: null,
    currentPage: 0,
    totalPages: 0,
    pageSize: initialPageSize
  });

  const storeData = useCallback(async (name: string, data: any[]) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const datasetInfo = await dataStorage.storeDataset(name, data);
      const totalPages = Math.ceil(datasetInfo.totalRows / initialPageSize);
      
      // Load first page
      const firstPageData = await dataStorage.getDataRange(
        datasetInfo.id, 
        0, 
        Math.min(initialPageSize - 1, datasetInfo.totalRows - 1)
      );

      setState({
        datasetInfo,
        currentData: firstPageData,
        loading: false,
        error: null,
        currentPage: 0,
        totalPages,
        pageSize: initialPageSize
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, [initialPageSize]);

  const loadPage = useCallback(async (page: number) => {
    if (!state.datasetInfo || state.loading) return;

    setState(prev => ({ ...prev, loading: true }));

    try {
      const startRow = page * state.pageSize;
      const endRow = Math.min(startRow + state.pageSize - 1, state.datasetInfo.totalRows - 1);
      
      const pageData = await dataStorage.getDataRange(
        state.datasetInfo.id,
        startRow,
        endRow
      );

      setState(prev => ({
        ...prev,
        currentData: pageData,
        currentPage: page,
        loading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load page'
      }));
    }
  }, [state.datasetInfo, state.pageSize, state.loading]);

  const getSampleData = useCallback(async (sampleSize: number = 10) => {
    if (!state.datasetInfo) return [];
    
    try {
      return await dataStorage.getSampleData(state.datasetInfo.id, sampleSize);
    } catch (error) {
      console.error('Failed to get sample data:', error);
      return [];
    }
  }, [state.datasetInfo]);

  const cleanup = useCallback(async () => {
    await dataStorage.cleanup();
    setState({
      datasetInfo: null,
      currentData: [],
      loading: false,
      error: null,
      currentPage: 0,
      totalPages: 0,
      pageSize: initialPageSize
    });
  }, [initialPageSize]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      dataStorage.cleanup();
    };
  }, []);

  return {
    ...state,
    storeData,
    loadPage,
    getSampleData,
    cleanup
  };
};