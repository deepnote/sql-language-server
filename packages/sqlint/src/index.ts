import { lint, LintResult } from './cli/lint'
import { RawConfig, defaultConfig } from './cli/loadConfig'
import { ErrorLevel, Diagnostic, Config } from './rules/index'
import { applyFixes } from './fixer'

export { lint, LintResult, ErrorLevel, Diagnostic, RawConfig, Config, applyFixes, defaultConfig }
