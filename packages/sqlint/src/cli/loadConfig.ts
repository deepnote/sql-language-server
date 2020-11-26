import { Config, ErrorLevel } from '../rules'

export const defaultConfig: RawConfig = {
  rules: {
    "align-column-to-the-first": "error",
    "column-new-line": "error",
    "linebreak-after-clause-keyword": "error",
    "reserved-word-case": { level: ErrorLevel.Error, option: 'upper' },
    "space-surrounding-operators": "error",
    "where-clause-new-line": "error",
    "align-where-clause-to-the-first": "error"
  }
}

export type RawConfig = {
  rules: {
    [key: string]: string | number | { level: string | number, option: any }
  }
}

export function convertToConfig(rawConfig: RawConfig): Config {
  return Object.entries(rawConfig.rules).reduce((p, c) => {
    let level = 0
    let option = null
    const getLevel = (v: any) => {
      if (typeof v === 'number') {
        return v
      }
      if (typeof v === 'string') {
        switch(v) {
          case 'error': return 2
          case 'warning': return 1
          case 'off': return 0
          default: throw new Error(`unknown error type: ${c[1]}`)
        }
      }
      return 0
    }
    if (Array.isArray(c[1])) {
      level = getLevel(c[1][0])
      option = c[1][1]
    } else {
      level = getLevel(c[1])
    }
    p.rules[c[0]] = { level, option }
    return p
  }, { rules: {} } as Config)
}
