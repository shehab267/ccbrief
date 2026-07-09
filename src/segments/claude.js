// Claude-session segments: reasoning effort, thinking state, output style, and
// active subagent name. Each hides when its source field is absent.
import { clean } from '../format.js'

export const effort = {
  id: 'effort', section: 'claude',
  isAvailable: (input) => Boolean(input?.effort?.level),
  format: (input, theme) => `${theme.glyph('effort') ? theme.glyph('effort') + ' ' : ''}${clean(input.effort.level)}`,
}

export const thinking = {
  id: 'thinking', section: 'claude',
  isAvailable: (input) => input?.thinking?.enabled === true,
  format: (input, theme) => `${theme.glyph('thinking') ? theme.glyph('thinking') + ' ' : ''}thinking`,
}

export const outputStyle = {
  id: 'outputStyle', section: 'claude',
  isAvailable: (input) => Boolean(input?.output_style?.name),
  format: (input) => clean(input.output_style.name),
}

export const agent = {
  id: 'agent', section: 'claude',
  isAvailable: (input) => Boolean(input?.agent?.name),
  format: (input) => clean(input.agent.name),
}
