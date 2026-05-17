import {z} from 'zod'

export const createEventSchema = z.object({
    name: z.string().min(3, 'Event name must be at least 3 characters long').max(100,'Event name cannot be longer than 100 characters'), 
    description: z.string().min(1).optional(), 
    startDate: z.string().pipe(z.coerce.date()),
    endDate:   z.string().pipe(z.coerce.date()),
    isPublic: z.boolean().default(true)
})

export const joinEventSchema = z.object({})