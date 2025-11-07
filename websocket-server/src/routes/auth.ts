import { Router } from 'express'
import { prisma } from '../lib/prisma'

const router = Router()

// Demo login - in production, use proper password hashing
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, role: true, password: true },
    })

    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Set session
    req.session.userId = user.id

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Login failed' })
  }
})

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true })
  })
})

router.get('/me', async (req, res) => {
  try {
    const userId = req.session.userId
    
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true },
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({ user })
  } catch (error) {
    console.error('Auth check error:', error)
    res.status(500).json({ error: 'Authentication check failed' })
  }
})

export default router
