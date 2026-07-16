import { z } from 'zod'

export const keyTermPatchSchema = z.object({
  value: z
    .string()
    .min(1, 'Value cannot be empty.')
    .max(1000, 'Value exceeds 1,000 character limit.'),
})

export const customTermSchema = z.object({
  contract_id: z.string().uuid(),
  term_name: z
    .string()
    .min(1, 'Term name cannot be empty.')
    .max(100, 'Term name exceeds 100 character limit.'),
})
