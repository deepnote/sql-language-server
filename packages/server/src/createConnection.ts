import { createConnection as _createConnection, IConnection} from 'vscode-languageserver';
import { IPCMessageReader, IPCMessageWriter } from 'vscode-jsonrpc';
import { ConnectionMethod } from './createServer'

export default function createConnection(method: ConnectionMethod): IConnection {
  switch (method) {
    case 'stdio': return _createConnection(process.stdin, process.stdout)
    case 'node-ipc':
    default:
      return _createConnection(new IPCMessageReader(process), new IPCMessageWriter(process))
  }
}
