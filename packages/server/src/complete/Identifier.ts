import { CompletionItem, CompletionItemKind } from 'vscode-languageserver-types'
import { ICONS } from './CompletionItemUtils'

type OnClause = 'FROM' | 'ALTER TABLE' | 'OTHERS'
export class Identifier {
  lastToken: string
  identifier: string
  detail: string
  kind: CompletionItemKind
  onClause: OnClause

  constructor(
    lastToken: string,
    identifier: string,
    detail: string,
    kind: CompletionItemKind,
    onClause?: OnClause
  ) {
    this.lastToken = lastToken
    this.identifier = identifier
    this.detail = detail ?? ''
    this.kind = kind
    this.onClause = onClause ?? 'OTHERS'
  }

  matchesLastToken(): boolean {
    if (this.identifier.startsWith(this.lastToken)) {
      // prevent suggesting the lastToken itself, there is nothing to complete in that case
      if (this.identifier !== this.lastToken) {
        return true
      }
    }
    return false
  }

  toCompletionItem(): CompletionItem {
    const idx = this.lastToken.lastIndexOf('.')
    const label = this.identifier.substring(idx + 1)
    if (
      this.kind === ICONS.TABLE ||
      this.kind === ICONS.DATABASE ||
      this.kind === ICONS.CATALOG
    ) {
      let tableName = label
      const i = tableName.lastIndexOf('.')
      if (i > 0) {
        tableName = label.substring(i + 1)
      }
    }

    const kindName = (() => {
      switch (this.kind) {
        case ICONS.TABLE:
          return 'table'
        case ICONS.DATABASE:
          return 'schema'
        case ICONS.CATALOG:
          return 'database'
        case ICONS.FUNCTION:
          return 'function'
        case ICONS.ALIAS:
          return 'table'
        case ICONS.COLUMN:
          return 'column'
        default:
          return 'column'
      }
    })()

    const item: CompletionItem = {
      label: label,
      detail: `${kindName} ${this.detail}`,
      kind: this.kind,
    }

    if (this.kind === ICONS.TABLE) {
      item.insertText = label
    }
    return item
  }
}
