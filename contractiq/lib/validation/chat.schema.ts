import { z } from 'zod'

export const chatSessionSchema = z.object({
  contract_id: z.string().uuid({ message: 'contract_id must be a valid UUID.' }),
})

export const chatMessageSchema = z.object({
  contract_id: z.string().uuid(),
  session_id: z.string().uuid(),
  content: z
    .string()
    .min(1, 'Message cannot be empty.')
    .max(4000, 'Message exceeds 4,000 character limit.'),
})

export type ChatMessageInput = z.infer<typeof chatMessageSchema>
