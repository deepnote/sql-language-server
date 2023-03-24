import { Table } from '../../database_libs/AbstractClient'
import { Identifier } from '../Identifier'
import { ICONS } from '../CompletionItemUtils'

/**
 * Given a table returns all possible ways to refer to it.
 * That is by table name only, using the database scope,
 * using the catalog and database scopes.
 * @param table
 * @returns
 */
function getFullyQualifiedTableName(table: Table): string {
  if (table.catalog && table.database) {
    return table.catalog + '.' + table.database + '.' + table.tableName
  }
  if (table.database) {
    return table.database + '.' + table.tableName
  }
  return table.tableName
}

export function createCatalogDatabaseAndTableCandidates(
  tables: Table[],
  lastToken: string,
  onFromClause?: boolean
) {
  const qualificationLevel = lastToken.split('.').length - 1

  const qualifiedEntities = tables.flatMap((table) => {
    let qualificationNeeded = 0
    if (table.catalog) {
      qualificationNeeded++
    }
    if (table.database) {
      qualificationNeeded++
    }
    const qualificationLevelNeeded = qualificationNeeded - qualificationLevel
    switch (qualificationLevelNeeded) {
      case 0: {
        const tableIdentifier = new Identifier(
          lastToken,
          getFullyQualifiedTableName(table),
          '',
          ICONS.TABLE,
          onFromClause ? 'FROM' : 'OTHERS'
        )
        return [tableIdentifier]
      }
      case 1: {
        const qualifiedDatabaseName =
          table.catalog && table.database
            ? table.catalog + '.' + table.database
            : table.database

        if (qualifiedDatabaseName !== null) {
          const databaseIdentifier = new Identifier(
            lastToken,
            qualifiedDatabaseName,
            '',
            ICONS.DATABASE,
            onFromClause ? 'FROM' : 'OTHERS'
          )
          return [databaseIdentifier]
        }
        break
      }
      case 2:
        if (table.catalog) {
          const catalogIdentifier = new Identifier(
            lastToken,
            table.catalog,
            '',
            ICONS.CATALOG,
            onFromClause ? 'FROM' : 'OTHERS'
          )
          return [catalogIdentifier]
        }
        break
    }
    return []
  })

  return qualifiedEntities
    .filter((item) => item.matchesLastToken())
    .map((item) => item.toCompletionItem())
}
