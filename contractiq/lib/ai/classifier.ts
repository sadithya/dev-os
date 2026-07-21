export type QueryType = 'contract' | 'history' | 'both'

const HISTORY_PATTERNS = [
  // Direct recall of prior statements
  /what did you (say|mention|tell me|explain|describe) (earlier|before|previously|just now|a moment ago)/i,
  /earlier you (said|mentioned|told me|explained|noted|stated)/i,
  /you (said|mentioned|told me|explained|noted|stated|pointed out) (earlier|before|previously|that|just)/i,
  /in your (previous|last|earlier|prior|first|second|last few) (response|answer|message|reply|explanation)/i,
  // Recall / repeat requests
  /can you (repeat|summarise|summarize|recap|go over|remind me of|restate) what you (said|mentioned|told me|explained)/i,
  /what was (the|your) (first|last|previous|earlier) (thing|point|answer|response|explanation)/i,
  /go back to what you said/i,
  /remind me what you said/i,
  // Continuation / follow-up from conversation
  /you mentioned (earlier|before|previously|that|just)/i,
  /based on what you (said|told me|mentioned|explained)/i,
  /from (your|our) (previous|earlier|last|prior) (response|answer|conversation|discussion|exchange)/i,
  /in (our|this) conversation/i,
  /as you (said|mentioned|noted|explained|pointed out)/i,
  /you (previously|already|just) (said|mentioned|told me|noted|explained)/i,
]

const CONTRACT_KEYWORDS = /\b(contract|agreement|clause|term|section|page|document|party|parties|provision|schedule|exhibit|annex|appendix|nda|msa|confidential|obligation|liability|indemnif|terminat|payment|fee|govern|jurisdict|warrant|represent)\b/i

export function classifyQuery(message: string): QueryType {
  const isHistory = HISTORY_PATTERNS.some((p) => p.test(message))
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
