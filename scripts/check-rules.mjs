#!/usr/bin/env node
/*
 * Checks the two non-negotiables in CLAUDE.md that no linter can express:
 *
 *   Rule 12 — no barrel files. A barrel is a *file shape*, not an import, so
 *             eslint's no-restricted-imports can stop you using one but cannot
 *             stop you creating one.
 *   Rule 21 — every TODO carries an issue reference, `// TODO(#42): ...`.
 *             no-warning-comments can only ban the word outright, which would
 *             also ban the compliant form.
 *
 * No dependencies, by design (rule 28). Run via `pnpm ci:rules`.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import process from 'node:process'

const ROOTS = ['src', 'e2e']
const SKIP_DIRS = new Set(['node_modules', 'dist', 'coverage', '.git'])
const SOURCE = /\.(ts|mts|cts|tsx|js|mjs|cjs|vue)$/
const TAG = /\b(TODO|FIXME|HACK|XXX)\b/
const TAGGED = /\b(TODO|FIXME|HACK|XXX)\(#\d+\)/

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) walk(path, out)
    else if (SOURCE.test(entry)) out.push(path)
  }
  return out
}

/*
 * Conservative: a file counts as a barrel only when it re-exports at least once
 * and contains nothing else of substance. src/router/index.ts builds a router,
 * so it is correctly left alone.
 */
function isBarrel(path, text) {
  if (!/(^|\/)index\.(ts|mts|js|mjs)$/.test(path)) return false

  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith('//') && !line.startsWith('*') && !line.startsWith('/*'))

  const reExports = lines.filter(
    (line) => /^export\s[^=]*\sfrom\s/.test(line) || /^export\s\*/.test(line),
  )
  if (reExports.length === 0) return false

  const other = lines.filter((line) => !reExports.includes(line) && !line.startsWith('import '))
  return other.length === 0
}

const violations = []

for (const root of ROOTS) {
  let files
  try {
    files = walk(root)
  } catch {
    continue // root does not exist yet
  }

  for (const path of files) {
    const text = readFileSync(path, 'utf8')
    const shown = relative(process.cwd(), path)

    if (isBarrel(path, text)) {
      violations.push(
        `${shown}:1  rule 12 — barrel file; import modules by their real path instead`,
      )
    }

    text.split('\n').forEach((line, i) => {
      if (TAG.test(line) && !TAGGED.test(line)) {
        violations.push(
          `${shown}:${i + 1}  rule 21 — TODO without an issue reference; use TODO(#42): ...`,
        )
      }
    })
  }
}

if (violations.length > 0) {
  console.error(`\n${violations.length} rule violation(s):\n`)
  for (const violation of violations) console.error(`  ${violation}`)
  console.error('\nSee CLAUDE.md for the rules, including how to break one deliberately.\n')
  process.exit(1)
}

console.log('check-rules: no violations')
