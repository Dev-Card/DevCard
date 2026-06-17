export function createSlug(name:string){
    return name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]+/g, '').replace(/-+/g, '-').replace(/^-+|-+$/g, '')
}

export async function generateUniqueSlug(name: string, 
    slugExists: (slug: string) => Promise<boolean> 
){
    const cleanSlug = createSlug(name)
    let finalSlug = cleanSlug; 
    while(true){
        const exists = await slugExists(finalSlug)

        if(!exists) break; 

        const randomSuffix  = Math.random().toString(36).substring(2,6); 
        finalSlug = `${cleanSlug}-${randomSuffix}` 
    }
    return finalSlug; 
}
