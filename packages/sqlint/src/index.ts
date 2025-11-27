import { lint, LintResult } from './cli/lint'
import { RawConfig } from './cli/loadConfig'
import { ErrorLevel, Diagnostic, Config } from './rules/index'
import { applyFixes, FixDescription } from './fixer'

export {
  lint,
  LintResult,
  ErrorLevel,
  Diagnostic,
  RawConfig,
  Config,
  applyFixes,
  FixDescription,
}
