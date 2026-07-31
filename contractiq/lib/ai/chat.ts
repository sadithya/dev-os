import azureClient from '@/lib/azure'
import {
  getContractSystemPrompt,
  getHistorySystemPrompt,
  getBothSystemPrompt,
} from './prompts/chat-system'
import { type QueryType } from './classifier'
import { CHAT_CONTEXT_CONTRACT_TURNS, CHAT_CONTEXT_HISTORY_TURNS } from '@/lib/constants'

export interface ChatHistoryMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function callChat(params: {
  contractText: string
  history: ChatHistoryMessage[]
  newUserMessage: string
  queryType: QueryType
}): Promise<string> {
  const { contractText, history, newUserMessage, queryType } = params

  const parts: string[] = []

  if (queryType === 'history') {
    const trimmed = history.slice(-(CHAT_CONTEXT_HISTORY_TURNS * 2))
    parts.push(getHistorySystemPrompt())
    if (trimmed.length > 0) {
      parts.push('\nCONVERSATION HISTORY:')
      for (const m of trimmed) parts.push(`${m.role.toUpperCase()}: ${m.content}`)
    }
  } else {
    const trimmed = history.slice(-(CHAT_CONTEXT_CONTRACT_TURNS * 2))
    const systemPrompt =
      queryType === 'both'
        ? getBothSystemPrompt(contractText)
        : getContractSystemPrompt(contractText)
    parts.push(systemPrompt)
    if (trimmed.length > 0) {
      parts.push('\nCONVERSATION HISTORY:')
      for (const m of trimmed) parts.push(`${m.role.toUpperCase()}: ${m.content}`)
    }
  }

  parts.push(`\nUSER QUESTION: ${newUserMessage}`)

  const bundledMessage = parts.join('\n')

  // Cast to any: Azure agent rejects a model field, but the SDK types require it
  const response = await (azureClient.responses as any).create({
    input: [{ role: 'user', content: bundledMessage }],
  })

  return response.output_text ?? 'I was unable to generate a response. Please try again.'
}
