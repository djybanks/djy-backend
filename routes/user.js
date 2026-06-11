import express from 'express'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const router = express.Router()

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

// GET PROFIL
router.get('/profile', async (req, res) => {
    const authHeader = req.headers.authorization
    if (!authHeader) return res.status(401).json({ error: 'Token manquant' })

    const token = authHeader.replace('Bearer ', '')

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return res.status(401).json({ error: 'Token invalide' })

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    if (error) return res.status(500).json({ error: error.message })

    res.json({ success: true, user: profile })
})

// UPDATE PROFIL
router.put('/profile', async (req, res) => {
    const authHeader = req.headers.authorization
    if (!authHeader) return res.status(401).json({ error: 'Token manquant' })

    const token = authHeader.replace('Bearer ', '')

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return res.status(401).json({ error: 'Token invalide' })

    const { username, bio, avatar_color, selected_language, interface_lang } = req.body

    const updates = {}
    if (username) updates.username = username
    if (bio !== undefined) updates.bio = bio
    if (avatar_color) updates.avatar_color = avatar_color
    if (selected_language) updates.selected_language = selected_language
    if (interface_lang) updates.interface_lang = interface_lang

    const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single()

    if (error) return res.status(500).json({ error: error.message })

    res.json({ success: true, user: data })
})

// UPDATE XP
router.put('/xp', async (req, res) => {
    const authHeader = req.headers.authorization
    if (!authHeader) return res.status(401).json({ error: 'Token manquant' })

    const token = authHeader.replace('Bearer ', '')

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return res.status(401).json({ error: 'Token invalide' })

    const { xp } = req.body
    if (xp === undefined) return res.status(400).json({ error: 'XP requis' })

    const { data, error } = await supabase
        .from('profiles')
        .update({ xp })
        .eq('id', user.id)
        .select()
        .single()

    if (error) return res.status(500).json({ error: error.message })

    res.json({ success: true, user: data })
})

export default router