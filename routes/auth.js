import express from 'express'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const router = express.Router()

// Client avec la clé service_role pour accéder aux fonctions admin
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// INSCRIPTION
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Tous les champs sont requis.' })
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Mot de passe minimum 6 caractères.' })
  }

  // Utilisation de la méthode admin pour forcer la création sans restriction d'email
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  })

  if (error) {
    return res.status(400).json({ error: error.message })
  }

  const userId = data.user?.id

  if (userId) {
    // Insertion avec uniquement les colonnes id et username
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        username
      })

    if (profileError) {
      return res.status(500).json({ error: profileError.message })
    }
  }

  res.json({
    success: true,
    message: 'Compte créé avec succès.',
    user: {
      id: userId,
      username,
      email
    }
  })
})

// CONNEXION
router.post('/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis.' })
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) {
    return res.status(401).json({ error: 'Email ou mot de passe incorrect.' })
  }

  const userId = data.user?.id
  const token = data.session?.access_token

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (profileError) {
    return res.status(500).json({ error: profileError.message })
  }

  res.json({
    success: true,
    token,
    user: profile
  })
})

// DÉCONNEXION
router.post('/logout', async (req, res) => {
  const { error } = await supabase.auth.signOut()

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  res.json({ success: true, message: 'Déconnecté avec succès.' })
})

export default router