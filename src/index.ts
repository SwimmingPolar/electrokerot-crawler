import dotenv from 'dotenv'
dotenv.config({
  path: 'config/dev.env'
})
import express, { Request, Response } from 'express'

import log from 'utils/logger'
import { initiateBrowser } from 'utils/puppeteerHelper'
import requestLimiter from 'middlewares/requestLimiter'
import api from './api'

// ignore-prettier
const app = express()

;(async () => {
  // initiate browser instance
  await initiateBrowser()

  // health check
  app.get('/', (req: Request, res: Response) => {
    res.status(200).send()
  })

  // connect routes
  app.use('/', requestLimiter, api)

  // disallow unknown requests
  app.all('*', (req: Request, res: Response) => {
    res.status(403).send()
  })

  // start crawler
  const PORT = process.env.PORT || 20000
  app.listen(PORT, () => {
    log.info(`Crawler running on ${PORT}`)
  })
})()
