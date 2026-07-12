// Claude-session segments: reasoning effort, thinking state, output style, and
// active subagent name. Each hides when its source field is absent.
import { clean } from '../format.js'

export const effort = {
  id: 'effort', title: 'reasoning effort', section: 'claude',
  isAvailable: (input) => Boolean(input?.effort?.level),
  format: (input, theme) => `${theme.icon('effort')}${theme.primary(clean(input.effort.level))}`,
}

export const thinking = {
  id: 'thinking', title: 'thinking indicator', section: 'claude',
  isAvailable: (input) => input?.thinking?.enabled === true,
  format: (input, theme) => `${theme.icon('thinking')}${theme.primary('thinking')}`,
}

export const outputStyle = {
  id: 'outputStyle', title: 'output style', section: 'claude',
  isAvailable: (input) => Boolean(input?.output_style?.name),
  format: (input, theme) => theme.primary(clean(input.output_style.name)),
}

export const agent = {
  id: 'agent', title: 'active agent', section: 'claude',
  isAvailable: (input) => Boolean(input?.agent?.name),
  format: (input, theme) => theme.primary(clean(input.agent.name)),
}
