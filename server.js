import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import authRoutes from './routes/auth.js'
import userRoutes from './routes/user.js'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
)

app.use('/auth', authRoutes)
app.use('/user', userRoutes)

app.get('/', (req, res) => {
    res.json({ message: 'DJY Academy Backend is running 🚀' })
})

app.get('/test-supabase', async (req, res) => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(1)

    if (error) return res.status(500).json({ error: error.message })

    res.json({ success: true, data })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
})