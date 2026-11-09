import { execFileSync, execSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const fixture = join(root, '__test__', 'fixtures', 'declaration')
const tsc = join(root, 'node_modules', 'typescript', 'bin', 'tsc')

describe('declaration emit', () => {
  beforeAll(() => {
    execSync('pnpm build', { cwd: root, stdio: 'pipe' })
  })

  it('names exported app types from the package entry', () => {
    const outDir = mkdtempSync(join(tmpdir(), 'express-zod-dts-'))

    try {
      execFileSync(
        process.execPath,
        [tsc, '-p', join(fixture, 'tsconfig.json'), '--outDir', outDir],
        {
          cwd: root,
          stdio: 'pipe',
        },
      )

      expect(existsSync(join(outDir, 'app.d.ts'))).toBe(true)
    } catch (error) {
      const stderr = (error as { stderr?: Buffer }).stderr
      throw new Error(stderr?.toString() ?? String(error), { cause: error })
    } finally {
      rmSync(outDir, { recursive: true, force: true })
    }
  })
})
