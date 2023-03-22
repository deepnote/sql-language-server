import { CompletionItem, CompletionItemKind } from 'vscode-languageserver-types'

export const ICONS = {
  KEYWORD: CompletionItemKind.Text,
  COLUMN: CompletionItemKind.Interface,
  TABLE: CompletionItemKind.Field,
  FUNCTION: CompletionItemKind.Property,
  ALIAS: CompletionItemKind.Variable,
  UTILITY: CompletionItemKind.Event,
}

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
    let kindName: string
    if (this.kind === ICONS.TABLE) {
      let tableName = label
      const i = tableName.lastIndexOf('.')
      if (i > 0) {
        tableName = label.substring(i + 1)
      }
      kindName = 'table'
    } else {
      kindName = 'column'
    }

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
