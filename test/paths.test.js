import { test } from 'node:test'
import assert from 'node:assert/strict'
import { configDir, ccbriefDir, commandString } from '../src/paths.js'

test('CLAUDE_CONFIG_DIR overrides', () => {
  assert.equal(configDir({ CLAUDE_CONFIG_DIR: '/custom/cfg' }, 'linux'), '/custom/cfg')
})
test('POSIX uses $HOME/.claude', () => {
  assert.equal(configDir({ HOME: '/home/dev' }, 'linux'), '/home/dev/.claude')
})
test('Windows uses %USERPROFILE%\\.claude', () => {
  assert.equal(configDir({ USERPROFILE: 'C:\\Users\\dev' }, 'win32'), 'C:\\Users\\dev\\.claude')
})
test('ccbriefDir nests under the config dir', () => {
  assert.equal(ccbriefDir({ HOME: '/home/dev' }, 'linux'), '/home/dev/.claude/ccbrief')
  assert.equal(ccbriefDir({ USERPROFILE: 'C:\\Users\\dev' }, 'win32'), 'C:\\Users\\dev\\.claude\\ccbrief')
})
test('commandString is forward-slashed, quoted, and node-invoked', () => {
  const cmd = commandString('C:\\Users\\dev\\.claude\\ccbrief')
  assert.equal(cmd, 'node "C:/Users/dev/.claude/ccbrief/statusline.js"')
})
test('commandString survives paths with spaces', () => {
  assert.equal(commandString('C:\\Users\\John Doe\\.claude\\ccbrief'), 'node "C:/Users/John Doe/.claude/ccbrief/statusline.js"')
})
