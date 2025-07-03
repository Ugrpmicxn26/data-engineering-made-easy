-- Create tables for temporary data storage to reduce memory usage
CREATE TABLE public.temp_datasets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  dataset_name TEXT NOT NULL,
  total_rows INTEGER NOT NULL DEFAULT 0,
  columns JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.temp_data_chunks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dataset_id UUID NOT NULL REFERENCES public.temp_datasets(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  chunk_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security (but allow all operations since no auth)
ALTER TABLE public.temp_datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.temp_data_chunks ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for all operations
CREATE POLICY "Allow all operations on temp_datasets" 
ON public.temp_datasets 
FOR ALL 
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all operations on temp_data_chunks" 
ON public.temp_data_chunks 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_temp_datasets_session_id ON public.temp_datasets(session_id);
CREATE INDEX idx_temp_data_chunks_dataset_id ON public.temp_data_chunks(dataset_id);
CREATE INDEX idx_temp_data_chunks_chunk_index ON public.temp_data_chunks(dataset_id, chunk_index);

-- Create function to clean up old data (older than 24 hours)
CREATE OR REPLACE FUNCTION public.cleanup_old_temp_data()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.temp_datasets 
  WHERE created_at < now() - INTERVAL '24 hours';
END;
$$;