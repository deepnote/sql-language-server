/* stubbing logger to make the lib work in browser */
export function stubLogger() {
  return {
    isDebugEnabled: function () {
      return false
    },
    debug: function (..._args: unknown[]) {
      return undefined
    },
    info: function (..._args: unknown[]) {
      return undefined
    },
    error: function (..._args: unknown[]) {
      return undefined
    },
  }
}
