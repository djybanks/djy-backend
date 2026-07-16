import express from 'express'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const router = express.Router()

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

  const { data, error } = await supabase.auth.signUp({
    email,
    password
  })

  if (error) {
    return res.status(400).json({ error: error.message })
  }

  const userId = data.user?.id

  if (userId) {
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        username
      }, { onConflict: 'id' })

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

// CONNEXION EMAIL/MOT DE PASSE
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

// CONNEXION GOOGLE — génère l'URL OAuth
router.get('/google', async (req, res) => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.FRONTEND_URL}/auth-callback.html`
    }
  })

  if (error) return res.status(500).json({ error: error.message })

  res.json({ success: true, url: data.url })
})

// CALLBACK GOOGLE — échange le code contre un token
router.get('/callback', async (req, res) => {
  const { code } = req.query

  if (!code) return res.status(400).json({ error: 'Code manquant' })

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) return res.status(500).json({ error: error.message })

  const userId = data.user?.id
  const token = data.session?.access_token
  const email = data.user?.email

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (!profile) {
    await supabase.from('profiles').upsert({
      id: userId,
      username: email.split('@')[0],
      email
    }, { onConflict: 'id' })
  }

  res.redirect(
    `${process.env.FRONTEND_URL}/auth-callback.html?token=${token}&userId=${userId}`
  )
})

// DÉCONNEXION PROPRE
router.post('/logout', async (req, res) => {
  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).json({ error: 'Token manquant' })

  const token = authHeader.replace('Bearer ', '')

  const { error } = await supabase.auth.admin.signOut(token)

  if (error) return res.status(500).json({ error: error.message })

  res.json({ success: true, message: 'Déconnecté avec succès.' })
})

// VÉRIFIER OTP
router.post('/verify-otp', async (req, res) => {
  const { email, token } = req.body

  if (!email || !token) {
    return res.status(400).json({ error: 'Email et code requis' })
  }

  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'signup'
  })

  if (error) return res.status(400).json({ error: 'Code invalide ou expiré' })

  const userId = data.user?.id
  const accessToken = data.session?.access_token

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  res.json({ success: true, token: accessToken, user: profile })
})

// RENVOYER OTP
router.post('/resend-otp', async (req, res) => {
  const { email } = req.body

  if (!email) return res.status(400).json({ error: 'Email requis' })

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email
  })

  if (error) return res.status(500).json({ error: error.message })

  res.json({ success: true, message: 'Code renvoyé' })
})

export default router