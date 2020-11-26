export type RawField = {
  field: string,
  type: string,
  null: 'Yes' | 'No',
  default: any,
  comment: string
}

export type Column = {
  columnName: string,
  description: string
}

export type Table = {
  database: string | null,
  tableName: string,
  columns: Column[]
}

export type Schema = Table[]
