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
    const results: Identifier[] = []

    // When user types without dots (qualificationLevel === 0), always include
    // a table name suggestion. This allows typing "act" to match "actor" even
    // if the table has a database (e.g., "squeal.actor").
    if (qualificationLevel === 0) {
      const tableIdentifier = new Identifier(
        lastToken,
        table.tableName,
        '',
        ICONS.TABLE,
        onFromClause ? 'FROM' : 'OTHERS'
      )
      results.push(tableIdentifier)
    }

    // Also add qualified suggestions (catalog/database) based on qualification level
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
        // Only add fully qualified name if we haven't already added just the table name
        if (qualificationLevel > 0) {
          const tableIdentifier = new Identifier(
            lastToken,
            getFullyQualifiedTableName(table),
            '',
            ICONS.TABLE,
            onFromClause ? 'FROM' : 'OTHERS'
          )
          results.push(tableIdentifier)
        }
        break
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
          results.push(databaseIdentifier)
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
          results.push(catalogIdentifier)
        }
        break
    }
    return results
  })

  return qualifiedEntities
    .filter((item) => item.matchesLastToken())
    .map((item) => item.toCompletionItem())
}
