import {
  IConnection,
  TextDocuments,
  InitializeResult,
  TextDocumentPositionParams,
  CompletionItem,
} from 'vscode-languageserver'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { CodeAction, TextDocumentEdit, TextEdit, Position, CodeActionKind } from 'vscode-languageserver-types'
import cache from './cache'
import complete from './complete'
import createDiagnostics from './createDiagnostics'
import createConnection from './createConnection'
import yargs from 'yargs'
import { Schema } from './database_libs/AbstractClient'
import { lint, LintResult } from 'sqlint'

export type ConnectionMethod = 'node-ipc' | 'stdio'
type Args = {
	method?: ConnectionMethod
}

export function createServerWithConnection(connection: IConnection) {
  let documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument)
  documents.listen(connection);

  let schema: Schema = [{
    database: 'deepnote',
    tableName: 'users',
    columns: [{
      columnName: 'id',
      description: ''
    },{
      columnName: 'email',
      description: 'users email'
    },]
  }]

  let hasConfigurationCapability = false

  async function makeDiagnostics(document: TextDocument) {
    const lintConfig = hasConfigurationCapability && (
      await connection.workspace.getConfiguration({
        section: 'sqlLanguageServer',
      })
    )?.lint || {}
    const hasRules = lintConfig.hasOwnProperty('rules')
    const diagnostics = createDiagnostics(
      document.uri,
      document.getText(),
      hasRules ? lintConfig : null
    )
    connection.sendDiagnostics(diagnostics)
  }

  documents.onDidChangeContent(async (params) => {
    console.debug(`onDidChangeContent: ${params.document.uri}, ${params.document.version}`)
    makeDiagnostics(params.document)
  })

  connection.onInitialize((params): InitializeResult => {
    const capabilities = params.capabilities
    hasConfigurationCapability = !!capabilities.workspace && !!capabilities.workspace.configuration;
    console.debug(`onInitialize: ${params.rootPath}`)

    return {
      capabilities: {
        textDocumentSync: 1,
        completionProvider: {
          resolveProvider: true,
          triggerCharacters: ['.'],
        },
        codeActionProvider: true,
        executeCommandProvider: {
          commands: [
            'sqlLanguageServer.switchDatabaseConnection',
            'sqlLanguageServer.fixAllFixableProblems'
          ]
        }
      }
    }
  })

  // connection.onInitialized(async () => {
  // 	SettingStore.getInstance().on('change', async () => {
  //     console.debug('onInitialize: receive change event from SettingStore')
  // 		try {
  //       try {
  //         connection.sendNotification('sqlLanguageServer.finishSetup', {
  //           personalConfig: SettingStore.getInstance().getPersonalConfig(),
  //           config: SettingStore.getInstance().getSetting()
  //         })
  //       } catch (e) {
  //         console.error(e)
  //       }
  //       try {
  //         const client = getDatabaseClient(
  //           SettingStore.getInstance().getSetting()
  //         )
  //         console.debug("get schema")
  //         console.debug(JSON.stringify(schema))
  //       } catch (e) {
  //         console.error("failed to get schema info")
  //         if (e instanceof RequireSqlite3Error) {
  //           connection.sendNotification('sqlLanguageServer.error', {
  //             message: "Need to rebuild sqlite3 module."
  //           })
  //         }
  //         throw e
  //       }
  //     } catch (e) {
  //       console.error(e)
  //     }
  //   })
  //   const connections = hasConfigurationCapability && (
  //     await connection.workspace.getConfiguration({
  //       section: 'sqlLanguageServer',
  //     })
  //   )?.connections || []
  //   if (connections.length > 0) {
  //     SettingStore.getInstance().setSettingFromWorkspaceConfig(connections)
  //   } else if (rootPath) {
  //     SettingStore.getInstance().setSettingFromFile(
  //       `${process.env.HOME}/.config/sql-language-server/.sqllsrc.json`,
  //       `${rootPath}/.sqllsrc.json`,
  //       rootPath || ''
  //     )
  //   }
  // })

  connection.onDidChangeConfiguration(change => {
    console.debug('onDidChangeConfiguration', JSON.stringify(change))
    if (!hasConfigurationCapability) {
      return
    }
    const connections = change.settings?.sqlLanguageServer?.connections ?? []
    if (connections.length > 0) {
      // todo change schema to the new one
      // SettingStore.getInstance().setSettingFromWorkspaceConfig(connections)
    }

    const lint = change.settings?.sqlLanguageServer?.lint
    if (lint?.rules) {
      documents.all().forEach(v => {
        makeDiagnostics(v)
      })
    }
  })

  connection.onCompletion((docParams: TextDocumentPositionParams): CompletionItem[] => {
    let text = documents.get(docParams.textDocument.uri)?.getText()
    if (!text) {
      return []
    }
  	console.debug(text || '')
  	const candidates = complete(text, {
  		line: docParams.position.line,
  		column: docParams.position.character
  	}, schema).candidates
  	console.debug(candidates.map(v => v.label).join(","))
  	return candidates
  })

  connection.onCodeAction(params => {
    const lintResult = cache.findLintCacheByRange(params.textDocument.uri, params.range)
    if (!lintResult) {
      return []
    }
    const document = documents.get(params.textDocument.uri)
    if (!document) {
      return []
    }
    const text = document.getText()
    if (!text) {
      return []
    }

    function toPosition(text: string, offset: number) {
      const lines = text.slice(0, offset).split('\n')
      return Position.create(lines.length - 1, lines[lines.length - 1].length)
    }
    const fixes = Array.isArray(lintResult.lint.fix) ? lintResult.lint.fix : [lintResult.lint.fix]
    if (fixes.length === 0) {
      return []
    }
    const action = CodeAction.create(`fix: ${lintResult.diagnostic.message}`, {
      documentChanges:[
        TextDocumentEdit.create({ uri: params.textDocument.uri, version: document.version }, fixes.map((v: any) => {
          const edit = v.range.startOffset === v.range.endOffset
            ? TextEdit.insert(toPosition(text, v.range.startOffset), v.text)
            : TextEdit.replace({
                start: toPosition(text, v.range.startOffset),
                end: toPosition(text, v.range.endOffset)
              }, v.text)
          return edit
        }))
      ]
    }, CodeActionKind.QuickFix)
    action.diagnostics = params.context.diagnostics
    return [action]
  })

  connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
    return item
  })

  connection.onExecuteCommand((request) => {
    console.debug(`received executeCommand request: ${request.command}, ${request.arguments}`)
    if (request.command === 'switchDatabaseConnection') {
      try {
        // TODO change schema to the correct one
        // SettingStore.getInstance().changeConnection(request.arguments && request.arguments[0] || '')
      } catch (e) {
        connection.sendNotification('sqlLanguageServer.error', {
          message: e.message
        })
      }
    } else if (request.command === 'fixAllFixableProblems') {
      const uri = request.arguments ? request.arguments[0] : null
      if (!uri) {
        connection.sendNotification('sqlLanguageServer.error', {
          message: 'fixAllFixableProblems: Need to specify uri'
        })
        return
      }
      const document = documents.get(uri)
      const text = document?.getText()
      if (!text) {
        console.debug('Failed to get text')
        return
      }
      const result: LintResult[] = JSON.parse(lint({ formatType: 'json', text, fix: true }))
      if (result.length === 0 && result[0].fixedText) {
        console.debug("There's no fixable problems")
        return
      }
      console.debug('Fix all fixable problems', text, result[0].fixedText)
      connection.workspace.applyEdit({
        documentChanges: [
          TextDocumentEdit.create({ uri, version: document!.version }, [
            TextEdit.replace({
              start: Position.create(0, 0),
              end: Position.create(Number.MAX_VALUE, Number.MAX_VALUE)
            }, result[0].fixedText!)
          ])
        ]
      })
    }
  })

  connection.listen()
  console.info('start sql-languager-server')
  return connection
}

export function createServer() {
  let connection: IConnection = createConnection((yargs.argv as Args).method || 'node-ipc')
  return createServerWithConnection(connection)
}
