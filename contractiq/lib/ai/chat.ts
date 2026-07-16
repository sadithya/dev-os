import OpenAI from 'openai'
import { getChatSystemPrompt } from './prompts/chat-system'
import { OPENAI_CHAT_TEMP, OPENAI_CHAT_MAX_TOKENS } from '@/lib/constants'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export interface ChatHistoryMessage {
  role: 'user' | 'assistant'
  content: string
}

export function buildChatMessages(params: {
  contractText: string
  history: ChatHistoryMessage[]
  newUserMessage: string
}): OpenAI.ChatCompletionMessageParam[] {
  const { contractText, history, newUserMessage } = params

  return [
    { role: 'system', content: getChatSystemPrompt(contractText) },
    ...history.map((m) => ({ role: m.role, content: m.content })),
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
