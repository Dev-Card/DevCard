import {z} from 'zod'

export const createEventSchema = z.object({
    name: z.string().min(3, 'Event name must be at least 3 characters long').max(100,'Event name cannot be longer than 100 characters'), 
    description: z.string().min(1).optional(), 
    location: z.string().min(2, 'Location should be atleast 2 characters long').max(100,'Location cannot be longer than 100 characters'),
    startDate: z.string().pipe(z.coerce.date()),
    endDate:   z.string().pipe(z.coerce.date()),
    isPublic: z.boolean().default(true)
})

export const joinEventSchema = z.object({})