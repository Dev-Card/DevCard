import {z} from 'zod'; 

export const createTeamScehma  = z.object({
    name: z.string().min(3, 'Event name must be at least 3 characters long').max(100,'Event name cannot be longer than 100 characters'), 
    description: z.string().min(1).optional(), 
    avatarUrl : z.string().url().optional(), 
})


export const inviteMembers  = z.object({
    username: z.string().min(1,'Username must be atleast 1 character')
})

export const updateTeam = z.object({
  name: z.string().min(1, 'Name must be at least 1 character').optional(),
  description: z.string().min(1,'Description must be at least 1 character').optional(),
  avatarUrl: z.string().url('Invalid avatar URL').optional(),
}).refine(
  (data) =>
    data.name !== undefined ||
    data.description !== undefined ||
    data.avatarUrl !== undefined,
  {
    message: 'At least one field is required',
  }
)