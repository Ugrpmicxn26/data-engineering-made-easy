import { supabase } from "@/integrations/supabase/client";

export interface DatasetInfo {
  id: string;
  sessionId: string;
  datasetName: string;
  totalRows: number;
  columns: string[];
}

export interface DataChunk {
  chunkIndex: number;
  data: any[];
}

const CHUNK_SIZE = 100; // Rows per chunk to minimize memory usage

export class ChunkedDataStorage {
  private static instance: ChunkedDataStorage;
  private sessionId: string;

  private constructor() {
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static getInstance(): ChunkedDataStorage {
    if (!ChunkedDataStorage.instance) {
      ChunkedDataStorage.instance = new ChunkedDataStorage();
    }
    return ChunkedDataStorage.instance;
  }

  async storeDataset(name: string, data: any[]): Promise<DatasetInfo> {
    if (!data.length) {
      throw new Error("Cannot store empty dataset");
    }

    const columns = Object.keys(data[0]);
    
    // Create dataset record
    const { data: dataset, error: datasetError } = await supabase
      .from('temp_datasets')
      .insert({
        session_id: this.sessionId,
        dataset_name: name,
        total_rows: data.length,
        columns: columns
      })
      .select()
      .single();

    if (datasetError) {
      throw new Error(`Failed to create dataset: ${datasetError.message}`);
    }

    // Store data in chunks
    const chunks = this.chunkArray(data, CHUNK_SIZE);
    const chunkPromises = chunks.map((chunk, index) =>
      supabase
        .from('temp_data_chunks')
        .insert({
          dataset_id: dataset.id,
          chunk_index: index,
          chunk_data: chunk
        })
    );

    await Promise.all(chunkPromises);

    return {
      id: dataset.id,
      sessionId: this.sessionId,
      datasetName: name,
      totalRows: data.length,
      columns
    };
  }

  async getDatasetInfo(datasetId: string): Promise<DatasetInfo | null> {
    const { data, error } = await supabase
      .from('temp_datasets')
      .select('*')
      .eq('id', datasetId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      sessionId: data.session_id,
      datasetName: data.dataset_name,
      totalRows: data.total_rows,
      columns: data.columns as string[]
    };
  }

  async getDataChunk(datasetId: string, chunkIndex: number): Promise<any[]> {
    const { data, error } = await supabase
      .from('temp_data_chunks')
      .select('chunk_data')
      .eq('dataset_id', datasetId)
      .eq('chunk_index', chunkIndex)
      .single();

    if (error || !data) {
      return [];
    }

    return data.chunk_data as any[];
  }

  async getDataRange(datasetId: string, startRow: number, endRow: number): Promise<any[]> {
    const startChunk = Math.floor(startRow / CHUNK_SIZE);
    const endChunk = Math.floor(endRow / CHUNK_SIZE);
    
    const chunkPromises = [];
    for (let i = startChunk; i <= endChunk; i++) {
      chunkPromises.push(this.getDataChunk(datasetId, i));
    }

    const chunks = await Promise.all(chunkPromises);
    const allData = chunks.flat();

    const startOffset = startRow % CHUNK_SIZE;
    const endOffset = endRow - (startChunk * CHUNK_SIZE);
    
    return allData.slice(startOffset, endOffset + 1);
  }

  async getSampleData(datasetId: string, sampleSize: number = 10): Promise<any[]> {
    const info = await this.getDatasetInfo(datasetId);
    if (!info) return [];

    // Get first chunk for sample
    return this.getDataRange(datasetId, 0, Math.min(sampleSize - 1, info.totalRows - 1));
  }

  async cleanup(): Promise<void> {
    // Clean up this session's data
    await supabase
      .from('temp_datasets')
      .delete()
      .eq('session_id', this.sessionId);
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}

export const dataStorage = ChunkedDataStorage.getInstance();