import { complete } from '../../src/complete'

const SIMPLE_SCHEMA = {
  tables: [
    {
      catalog: null,
      database: null,
      tableName: 'TABLE1',
      columns: [
        { columnName: 'COLUMN1', description: '' },
        { columnName: 'COLUMN2', description: '' },
      ],
    },
  ],
  functions: [
    {
      name: 'array_concat()',
      description: 'desc1',
    },
    {
      name: 'array_contains()',
      description: 'desc2',
    },
  ],
}

describe('TableName completion', () => {
  test('complete function keyword', () => {
    const result = complete(
      'SELECT arr',
      { line: 0, column: 10 },
      SIMPLE_SCHEMA
    )
    expect(result.candidates.length).toEqual(2)
    expect(result.candidates[0].label).toEqual('array_concat()')
    expect(result.candidates[1].label).toEqual('array_contains()')
  })

  test('complete function keyword', () => {
    const result = complete(
      'SELECT ARR',
      { line: 0, column: 10 },
      SIMPLE_SCHEMA
    )
    expect(result.candidates.length).toEqual(2)
    expect(result.candidates[0].label).toEqual('ARRAY_CONCAT()')
    expect(result.candidates[1].label).toEqual('ARRAY_CONTAINS()')
  })

  test('complete TableName', () => {
    const result = complete(
      'SELECT T FROM TABLE1',
      { line: 0, column: 8 },
      SIMPLE_SCHEMA
    )
    expect(result.candidates.length).toEqual(1)
    expect(result.candidates[0].label).toEqual('TABLE1')
  })

  test('complete alias', () => {
    const result = complete(
      'SELECT ta FROM TABLE1 as tab',
      { line: 0, column: 9 },
      SIMPLE_SCHEMA
    )
    expect(result.candidates.length).toEqual(3)
    expect(result.candidates).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: 'tab' })])
    )
  })
  test('complete SELECT star', () => {
    const result = complete(
      'SELECT FROM TABLE1',
      { line: 0, column: 6 },
      SIMPLE_SCHEMA
    )
    expect(result.candidates.length).toEqual(2)
    expect(result.candidates[0].label).toEqual('Select all columns from TABLE1')
    expect(result.candidates[0].insertText).toEqual(
      'SELECT\nTABLE1.COLUMN1,\nTABLE1.COLUMN2'
    )
    expect(result.candidates[1].label).toEqual('SELECT')
  })

  // This is difficult because we can't parse the statement to get
  // at the column names
  test.skip('complete partial SELECT star', () => {
    const result = complete(
      'SELEC FROM TABLE1',
      { line: 0, column: 5 },
      SIMPLE_SCHEMA
    )
    expect(result.candidates.length).toEqual(2)
    expect(result.candidates[0].label).toEqual('SELECT')
    expect(result.candidates[1].label).toEqual('Select all columns from TABLE1')
    expect(result.candidates[1].insertText).toEqual(
      'SELECT\nTABLE1.COLUMN1,\nTABLE1.COLUMN2'
    )
  })

  test('complete SELECT star passed select ', () => {
    const result = complete(
      'SELECT  FROM TABLE1',
      { line: 0, column: 7 },
      SIMPLE_SCHEMA
    )
    const expected = [
      expect.objectContaining({
        label: 'Select all columns from TABLE1',
        insertText: 'TABLE1.COLUMN1,\nTABLE1.COLUMN2',
      }),
    ]
    expect(result.candidates).toEqual(expect.arrayContaining(expected))
  })

  test('complete table name after FROM keyword with partial input', () => {
    const schema = {
      tables: [
        {
          catalog: null,
          database: null,
          tableName: 'notes',
          columns: [{ columnName: 'id', description: '' }],
        },
        {
          catalog: null,
          database: null,
          tableName: 'users',
          columns: [{ columnName: 'name', description: '' }],
        },
      ],
      functions: [],
    }

    const result = complete(
      'SELECT * FROM not',
      { line: 0, column: 17 },
      schema
    )

    // Should suggest table names
    const labels = result.candidates.map((c) => c.label)
    expect(labels).toContain('notes')

    // Should NOT include any column suggestions (even if qualified)
    expect(labels).not.toEqual(expect.arrayContaining(['id', 'name']))

    // All candidates should be tables (CompletionItemKind.Constant = 21)
    const TABLE_KIND = 21
    expect(result.candidates.every((c) => c.kind === TABLE_KIND)).toBe(true)
  })
})
