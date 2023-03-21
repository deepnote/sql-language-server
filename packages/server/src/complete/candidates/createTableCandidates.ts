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

export function createTableCandidates(
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
      case 0:
        return [getFullyQualifiedTableName(table)]
      case 1:
        if (table.catalog && table.database) {
          return [table.catalog + '.' + table.database]
        }
        if (table.database) {
          return [table.database]
        }
        break
      case 2:
        if (table.catalog) {
          return [table.catalog]
        }
        break
    }
    return []
  })

  const uniqueEntities = [...new Set(qualifiedEntities)]

  return uniqueEntities
    .map((aTableNameVariant) => {
      return new Identifier(
        lastToken,
        aTableNameVariant,
        '',
        ICONS.TABLE,
        onFromClause ? 'FROM' : 'OTHERS'
      )
    })
    .filter((item) => item.matchesLastToken())
    .map((item) => item.toCompletionItem())
}
