import { CompletionItem } from 'vscode-languageserver-types'
import { FromTableNode } from '@deepnote/sql-parser'
import { toCompletionItemForAlias } from '../CompletionItemUtils'

export function createAliasCandidates(
  fromNodes: FromTableNode[],
  token: string
): CompletionItem[] {
  return fromNodes
    .map(
      (fromNode) => fromNode.as ?? ('table' in fromNode ? fromNode.table : null)
    )
    .filter((aliasName) => aliasName && aliasName.startsWith(token))
    .map((aliasName) => toCompletionItemForAlias(aliasName || ''))
}
