
export const defaultPythonCode = `# Python Notebook
# Available packages: pandas, numpy, matplotlib, scikit-learn
# The DataFrame is already loaded as 'df'

import pandas as pd
import numpy as np

# Display first 5 rows
print(df.head())

# Display column names
print("Columns:", df.columns.tolist())

# Basic info about the DataFrame
print(df.info())
print(df.describe())

# Example: Clean column data types
# df['column'] = df['column'].astype(str)
# df['column'] = df['column'].str.strip()
# df['column'] = df['column'].str.replace(',', '').replace('*', '0').astype(int)

# Example: Filter data
# filtered_df = df[df['column_name'] > 10]

# Example: Create a new column
# df['new_column'] = df['column1'] * df['column2']

# Example: Group by and aggregate
# grouped_df = df.groupby(['column1', 'column2'])['value_column'].sum().reset_index()

# Example: Compute market share
# total_by_group = df.groupby(['group_col'])['value_col'].transform('sum')
# df['market_share'] = df['value_col'] / total_by_group

# The last DataFrame variable in your code will be returned as the result
# This will be displayed in the preview panel and can be saved
df
`;
