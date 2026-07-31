import OpenAI from 'openai'

// Strip trailing /responses — the SDK appends it automatically on responses.create
const endpoint = (process.env.AZURE_AGENT_ENDPOINT ?? '').replace(/\/responses$/, '')

const azureClient = new OpenAI({
  apiKey: process.env.AZURE_API_KEY ?? '',
  baseURL: endpoint,
  defaultHeaders: {
    'api-key': process.env.AZURE_API_KEY ?? '',
  },
  defaultQuery: {
    'api-version': '2025-05-15-preview',
  },
})

export default azureClient
