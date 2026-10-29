// Lets Node run the TypeScript calculation modules directly (extensionless imports, as Vite resolves them).
import { register } from 'node:module'
register('./ts-ext-hook.mjs', import.meta.url)
