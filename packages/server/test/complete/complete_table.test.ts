import { complete } from '../../src/complete'

const simpleSchema = {
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

interface MockTableData {
  catalog: string | null
  columns: { columnName: string; description: string }[]
  database: string | null
  tableName: string
}

function mockSchema(...tableDefinitions: MockTableData[]) {
  return {
    functions: [],
    tables: tableDefinitions,
  }
}

function table(name: string): MockTableData {
  const demoTables: Record<string, string[]> = {
    actor: ['actor_id', 'first_name', 'last_name', 'last_update'],
    actor_info: ['actor_id', 'first_name', 'last_name', 'film_info'],
    address: [
      'address_id',
      'address',
      'address2',
      'district',
      'city_id',
      'postal_code',
      'phone',
      'last_update',
    ],
    customer: [
      'customer_id',
      'store_id',
      'first_name',
      'last_name',
      'email',
      'address_id',
      'activebool',
      'create_date',
      'last_update',
      'active',
    ],
    film: [
      'film_id',
      'title',
      'description',
      'release_year',
      'language_id',
      'original_language_id',
      'rental_duration',
      'rental_rate',
      'length',
      'replacement_cost',
      'rating',
      'last_update',
      'special_features',
      'fulltext',
    ],
    notes: ['id', 'note', 'last_modified'],
    staff: [
      'staff_id',
      'first_name',
      'last_name',
      'address_id',
      'email',
      'store_id',
      'active',
      'username',
      'password',
      'last_update',
      'picture',
    ],
    users: ['id', 'name', 'email', 'password'],
  }

  return {
    catalog: null,
    columns: (demoTables[name] || []).map((columnName) => ({
      columnName,
      description: '',
    })),
    database: 'demo',
    tableName: name,
  }
}

describe('TableName completion', () => {
  test('complete function keyword', () => {
    const result = complete('SELECT arr', { line: 0, column: 10 }, simpleSchema)

    expect(result.candidates.length).toEqual(2)
    expect(result.candidates[0].label).toEqual('array_concat()')
    expect(result.candidates[1].label).toEqual('array_contains()')
  })

  test('complete function keyword', () => {
    const result = complete('SELECT ARR', { line: 0, column: 10 }, simpleSchema)

    expect(result.candidates.length).toEqual(2)
    expect(result.candidates[0].label).toEqual('ARRAY_CONCAT()')
    expect(result.candidates[1].label).toEqual('ARRAY_CONTAINS()')
  })

  test('complete TableName', () => {
    const result = complete(
      'SELECT T FROM TABLE1',
      { line: 0, column: 8 },
      simpleSchema
    )

    expect(result.candidates.length).toEqual(1)
    expect(result.candidates[0].label).toEqual('TABLE1')
  })

  test('complete alias', () => {
    const result = complete(
      'SELECT ta FROM TABLE1 as tab',
      { line: 0, column: 9 },
      simpleSchema
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
      simpleSchema
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
      simpleSchema
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
      simpleSchema
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
    const schema = mockSchema(table('notes'), table('users'))

    const result = complete(
      'SELECT * FROM not',
      { line: 0, column: 17 },
      schema
    )

    const labels = result.candidates.map((c) => c.label)

    expect(labels).toContain('notes')

    expect(labels).not.toEqual(expect.arrayContaining(['id', 'name']))

    expect(result.candidates.every((c) => c.kind === 21)).toBe(true)
  })

  test('complete table name with database-qualified tables', () => {
    const schema = mockSchema(
      table('actor'),
      table('actor_info'),
      table('film')
    )

    // Test: typing 'a' after FROM should match 'actor' and 'actor_info'
    const result = complete('SELECT * FROM a', { line: 0, column: 15 }, schema)

    const labels = result.candidates.map((c) => c.label)

    expect(labels).toEqual(['actor', 'actor_info'])
  })

  test('complete table name when SQL parses successfully', () => {
    // This tests the case when the parser treats partial table name as valid
    // See https://github.com/deepnote/sql-language-server/issues/24
    const schema = mockSchema(
      table('actor'),
      table('actor_info'),
      table('film')
    )

    const result = complete(
      'SELECT * FROM act',
      { line: 0, column: 17 },
      schema
    )

    const labels = result.candidates.map((c) => c.label)

    expect(labels).toEqual(['actor', 'actor_info'])
  })

  test('complete table name with partial input after typing more characters', () => {
    const schema = mockSchema(
      table('actor'),
      table('actor_info'),
      table('customer'),
      table('film'),
      table('film_actor')
    )

    // Test: typing 'fil' should match 'film' and 'film_actor'
    const result = complete(
      'SELECT * FROM fil',
      { line: 0, column: 17 },
      schema
    )

    const labels = result.candidates.map((c) => c.label)

    expect(labels).toEqual(['film', 'film_actor'])
  })
})
