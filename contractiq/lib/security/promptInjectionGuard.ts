// Structural token patterns — manipulate the raw prompt format
const STRUCTURAL_PATTERNS = [
  /#{3,}/,
  /<\|/,
  /\|>/,
  /\[INST\]/i,
  /<<SYS>>/i,
  /<\/SYS>/i,
]

// Semantic injection patterns — attempt to override assistant behaviour
const SEMANTIC_PATTERNS = [
  /ignore (previous|prior|all|your) instructions/i,
  /override (your|these|the) (rules|instructions|guidelines|constraints)/i,
  /disregard (your|all|previous) (instructions|rules|training)/i,
  /forget (your|all|previous) (instructions|training|rules|guidelines)/i,
  /reveal (the|your|this) system prompt/i,
  /print (your|the|all) (instructions|system prompt|prompt)/i,
  /show (your|the|my|this) (instructions|system prompt|api key|secret)/i,
  /expose (env|environment) (variables?|vars?)/i,
  /what (are|is) your (instructions|system prompt|training|rules)/i,
  /you are now (a|an)/i,
  /act as (if you (are|were)|a|an)/i,
  /pretend (you are|to be|that you)/i,
  /roleplay as/i,
  /simulate (being|a|an)/i,
  /jailbreak/i,
  /\bdan mode\b/i,
  /developer mode/i,
  /do anything now/i,
  /\bno restrictions?\b/i,
  /bypass (your|all|these) (filters?|rules|restrictions?|guidelines?)/i,
  /turn off (your|the|all) (filters?|safety|restrictions?)/i,
]

function stripStructural(content: string): string {
  return content
    .replace(/#{3,}/g, '')
    .replace(/<\|/g, '')
    .replace(/\|>/g, '')
    .replace(/\[INST\]/gi, '')
    .replace(/<<SYS>>/gi, '')
    .replace(/<\/SYS>/gi, '')
    .trim()
}

export interface SanitizeResult {
  safe: boolean
  sanitised: string
}

export function sanitizeForLLM(content: string): SanitizeResult {
  const sanitised = stripStructural(content)

  if (!sanitised) {
    return { safe: false, sanitised }
  }

  const hasSemanticInjection = SEMANTIC_PATTERNS.some((p) => p.test(sanitised))
  if (hasSemanticInjection) {
    return { safe: false, sanitised }
  }

  return { safe: true, sanitised }
}
