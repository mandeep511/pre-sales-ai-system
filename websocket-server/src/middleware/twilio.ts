import { Request, Response, NextFunction } from 'express'
import twilio from 'twilio'

const validateTwilioSignature = (req: Request, res: Response, next: NextFunction) => {
  const authToken = process.env.TWILIO_AUTH_TOKEN

  if (!authToken) {
    console.warn('TWILIO_AUTH_TOKEN not set, skipping signature validation')
    return next()
  }

  const signature = req.headers['x-twilio-signature'] as string

  if (!signature) {
    return res.status(403).send('Missing Twilio signature')
  }

  const protocol = req.secure || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http'
  const host = req.get('host') || req.get('x-forwarded-host') || 'localhost'
  const url = `${protocol}://${host}${req.originalUrl}`

  const params = req.method === 'POST' ? req.body : req.query
  const isValid = twilio.validateRequest(authToken, signature, url, params)

  if (!isValid) {
    return res.status(403).send('Invalid Twilio signature')
  }

  next()
}

export { validateTwilioSignature }

