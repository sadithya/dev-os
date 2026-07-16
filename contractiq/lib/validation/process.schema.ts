import { z } from 'zod'
import { MAX_CUSTOM_TERMS } from '@/lib/constants'

export const processSchema = z.object({
  contract_id: z.string().uuid({ message: 'contract_id must be a valid UUID.' }),
  custom_terms: z
    .array(z.string().min(1).max(100))
    .max(MAX_CUSTOM_TERMS, { message: `Maximum ${MAX_CUSTOM_TERMS} custom terms allowed.` })
    .optional()
    .default([]),
})

export type ProcessInput = z.infer<typeof processSchema>
