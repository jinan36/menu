import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import test from 'node:test'

const studioRoot = fileURLToPath(new URL('../', import.meta.url))
const menuRoot = fileURLToPath(new URL('../../', import.meta.url))

for (const mode of ['development', 'production']) {
  test(`${mode} 模式下菜单、Studio 和 CLI 选择同一数据集`, () => {
    // 每种模式使用独立进程，避免 dotenv 缓存和进程环境污染结果。
    const env = {...process.env}
    for (const key of ['VITE_SANITY_DATASET', 'SANITY_STUDIO_DATASET', 'SANITY_ACTIVE_ENV']) {
      delete env[key]
    }
    const menu = spawnSync(process.execPath, ['--input-type=module', '-e', `
      import {loadEnv} from 'vite'
      const env = loadEnv('${mode}', process.cwd(), 'VITE_')
      if (env.VITE_SANITY_TOKEN) throw new Error('Write token must not be exposed to the menu')
      console.log(env.VITE_SANITY_DATASET)
    `], {cwd: menuRoot, env, encoding: 'utf8'})
    assert.equal(menu.status, 0, menu.stderr)
    assert.equal(menu.stdout.trim(), mode)

    const studio = spawnSync(process.execPath, ['--input-type=module', '-e', `
      import {getStudioEnvironmentVariables} from 'sanity/cli'
      getStudioEnvironmentVariables({envFile: {mode: '${mode}', envDir: process.cwd()}})
      const {dataset} = await import('./sanityEnvironment.js')
      console.log(dataset)
    `], {cwd: studioRoot, env, encoding: 'utf8'})
    assert.equal(studio.status, 0, studio.stderr)
    assert.equal(studio.stdout.trim(), mode)
  })
}
