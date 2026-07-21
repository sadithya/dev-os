import OpenAI from 'openai'
import {
  getContractSystemPrompt,
  getHistorySystemPrompt,
  getBothSystemPrompt,
} from './prompts/chat-system'
import { type QueryType } from './classifier'
import {
  OPENAI_CHAT_TEMP,
  OPENAI_CHAT_MAX_TOKENS,
  CHAT_CONTEXT_CONTRACT_TURNS,
  CHAT_CONTEXT_HISTORY_TURNS,
} from '@/lib/constants'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export interface ChatHistoryMessage {
  role: 'user' | 'assistant'
  content: string
}

export function buildChatMessages(params: {
  contractText: string
  history: ChatHistoryMessage[]
  newUserMessage: string
  queryType: QueryType
}): OpenAI.ChatCompletionMessageParam[] {
  const { contractText, history, newUserMessage, queryType } = params

  if (queryType === 'history') {
    // No contract text. Use up to CHAT_CONTEXT_HISTORY_TURNS turns (each turn = 2 messages).
    const trimmed = history.slice(-(CHAT_CONTEXT_HISTORY_TURNS * 2))
    return [
      { role: 'system', content: getHistorySystemPrompt() },
      ...trimmed.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: newUserMessage },
    ]
  }

  // CONTRACT or BOTH: include contract text + last CHAT_CONTEXT_CONTRACT_TURNS turns.
  const trimmed = history.slice(-(CHAT_CONTEXT_CONTRACT_TURNS * 2))
  const systemPrompt =
    queryType === 'both'
      ? getBothSystemPrompt(contractText)
      : getContractSystemPrompt(contractText)

  return [
    { role: 'system', content: systemPrompt },
    ...trimmed.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: newUserMessage },
  ]
}

export async function callChat(
  messages: OpenAI.ChatCompletionMessageParam[],
): Promise<string> {
  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    temperature: OPENAI_CHAT_TEMP,
    max_tokens: OPENAI_CHAT_MAX_TOKENS,
    messages,
  })
  return (
    response.choices[0]?.message?.content ??
    'I was unable to generate a response. Please try again.'
  )
}
