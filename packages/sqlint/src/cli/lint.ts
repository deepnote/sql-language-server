import chalk from 'chalk'
import { execute, Diagnostic, ErrorLevel } from '../rules'
import { RawConfig, convertToConfig, defaultConfig } from './loadConfig';
import { applyFixes, FixDescription } from '../fixer';

export type LintResult = {
  filepath: string,
  diagnostics: Diagnostic[],
  fixedText?: string
}

function pluralize(word: string, count: number) {
    return (count === 1 ? word : `${word}s`);
}

type FormatType = 'stylish' | 'json'

function formatStylish(result: LintResult[]): string {
  const targetResult = result.filter(v => v.diagnostics.length > 0)
  let output = '\n', errorCount = 0, warningCount = 0
  if (targetResult.length === 0) {
    return output
  }
  targetResult.forEach(v => {
    output += chalk.underline(v.filepath) + '\n'
    v.diagnostics.forEach(v2 => {
      const position = chalk.dim(`${v2.location.start.line}:${v2.location.start.offset}`)
      const messageType = v2.errorLevel === ErrorLevel.Error ? chalk.red('error') : chalk.yellow('warning')
      const message = v2.message
      const ruleName = chalk.dim(v2.rulename)
      output += `  ${position} ${messageType} ${message} ${ruleName}\n`
      if (v2.errorLevel === ErrorLevel.Error) errorCount++
      else if(v2.errorLevel === ErrorLevel.Warn) warningCount++
    })
  })
  output += '\n'
  const total = errorCount + warningCount
  output += chalk.bold.red(
    [
      `\u2716 ${total} ${pluralize('problem', total)}`,
      `(${errorCount} ${pluralize('error', errorCount)},`,
      `${warningCount} ${pluralize('warning', warningCount)})`
    ].join(' ')
  )
  return output
}

export function lint (
  params: {
    path?: string
    formatType: FormatType
    text: string
    fix?: boolean
    configObject?: RawConfig
  }
) {
  const { path, formatType, text, configObject } = params
  if (!text) {
    throw new Error(`No files matching. path: ${path}`)
  }
  const config = convertToConfig(configObject ?? defaultConfig)
  let result: LintResult[] = [{ filepath: 'text', diagnostics: execute(text, config) }]
  let output = ''

  if (params.fix) {
    const fixedResult = result.map(v => {
      const MAX_AUTOFIX_LOOP = 3
      function getFixDescriptions(diagnostics: Diagnostic[]): FixDescription[] {
        return diagnostics.map(v => v.fix).flat()
      }
      function fix(text: string, descriptions: FixDescription[], loop = MAX_AUTOFIX_LOOP): string {
        if (loop === 0) {
          return text
        }
        const fixed = applyFixes(text, descriptions)
        const nextDiagnostics = execute(fixed, config)
        const newDescriptions = getFixDescriptions(nextDiagnostics)
        if (newDescriptions.length === 0) {
          return fixed
        }
        return fix(fixed, newDescriptions, --loop)
      }
      const fixedText = fix(params.text, getFixDescriptions(v.diagnostics))
      const diagnostics = execute(fixedText, config)
      return { filepath: v.filepath, diagnostics, fixedText }
    })
    result = fixedResult
  }
  switch(formatType) {
    case 'stylish': output = formatStylish(result); break
    case 'json': output = JSON.stringify(result); break
    default: throw new Error(`unsupported formatType: ${formatType}`)
  }

  return output
}
