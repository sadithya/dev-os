import { z } from 'zod'

export const feedbackSchema = z.object({
  contract_id: z.string().uuid({ message: 'contract_id must be a valid UUID.' }),
  rating: z.enum(['thumbs_up', 'thumbs_down'], {
    errorMap: () => ({ message: "Rating must be 'thumbs_up' or 'thumbs_down'." }),
  }),
  comment: z.string().max(2000, 'Comment exceeds 2,000 character limit.').optional(),
})

export type FeedbackInput = z.infer<typeof feedbackSchema>
