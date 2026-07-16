export type QueryType = 'contract' | 'history' | 'both'

const HISTORY_PATTERNS = [
  /what did you (say|mention|tell me) (earlier|before|previously)/i,
  /earlier you (said|mentioned|told me)/i,
  /you (said|mentioned|told me) that/i,
  /in your (previous|last|earlier) (response|answer|message)/i,
  /can you (repeat|summarise|summarize) what you said/i,
]

const CONTRACT_KEYWORDS = /contract|agreement|clause|term|section|page|document|party|parties/i

export function classifyQuery(message: string): QueryType {
  const isHistory = HISTORY_PATTERNS.some((pattern) => pattern.test(message))
  if (isHistory) {
    return CONTRACT_KEYWORDS.test(message) ? 'both' : 'history'
  }
  return 'contract'
}

export function sanitiseChatInput(content: string): string {
  return content
    .replace(/#{3,}/g, '')
    .replace(/<\|/g, '')
    .replace(/\|>/g, '')
    .replace(/\[INST\]/gi, '')
    .replace(/<<SYS>>/gi, '')
    .replace(/<\/SYS>/gi, '')
    .trim()
}
