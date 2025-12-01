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

  test('complete table name with database-qualified tables', () => {
    const schema = {
      tables: [
        {
          catalog: null,
          database: 'squeal',
          tableName: 'actor',
          columns: [{ columnName: 'actor_id', description: '' }],
        },
        {
          catalog: null,
          database: 'squeal',
          tableName: 'actor_info',
          columns: [{ columnName: 'actor_id', description: '' }],
        },
        {
          catalog: null,
          database: 'squeal',
          tableName: 'film',
          columns: [{ columnName: 'film_id', description: '' }],
        },
      ],
      functions: [],
    }

    // Test: typing 'a' after FROM should match 'actor' and 'actor_info'
    const result = complete('SELECT * FROM a', { line: 0, column: 15 }, schema)

    const labels = result.candidates.map((c) => c.label)
    expect(labels).toContain('actor')
    expect(labels).toContain('actor_info')
    expect(labels).not.toContain('film')
  })

  test('complete table name when SQL parses successfully', () => {
    // This tests Issue 1 - when the parser treats partial table name as valid
    const schema = {
      tables: [
        { catalog: null, database: null, tableName: 'actor', columns: [] },
        { catalog: null, database: null, tableName: 'actor_info', columns: [] },
        { catalog: null, database: null, tableName: 'film', columns: [] },
      ],
      functions: [],
    }

    const result = complete(
      'SELECT * FROM act',
      { line: 0, column: 17 },
      schema
    )

    const labels = result.candidates.map((c) => c.label)
    expect(labels).toContain('actor')
    expect(labels).toContain('actor_info')
    expect(labels).not.toContain('film')
  })

  test('complete table name with partial input after typing more characters', () => {
    const schema = {
      tables: [
        {
          catalog: null,
          database: 'squeal',
          tableName: 'actor',
          columns: [],
        },
        {
          catalog: null,
          database: 'squeal',
          tableName: 'actor_info',
          columns: [],
        },
        {
          catalog: null,
          database: 'squeal',
          tableName: 'film',
          columns: [],
        },
        {
          catalog: null,
          database: 'squeal',
          tableName: 'film_actor',
          columns: [],
        },
        {
          catalog: null,
          database: 'squeal',
          tableName: 'customer',
          columns: [],
        },
      ],
      functions: [],
    }

    // Test: typing 'fil' should match 'film' and 'film_actor'
    const result = complete(
      'SELECT * FROM fil',
      { line: 0, column: 17 },
      schema
    )

    const labels = result.candidates.map((c) => c.label)
    expect(labels).toContain('film')
    expect(labels).toContain('film_actor')
    expect(labels).not.toContain('actor')
    expect(labels).not.toContain('customer')
  })
})
