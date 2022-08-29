import dotenv from 'dotenv'
if (process.env.NODE_ENV?.trim() === 'development') {
  dotenv.config({
    path: 'config/dev.env'
  })
}
import express, { Request, Response } from 'express'
import bodyParser from './middlewares/bodyParser'
import { log } from './utils'
import { initiateBrowser, checkProxyStatus } from './helper'
import api from './api'

const app = express()
app.use(bodyParser)
;(async () => {
  // check proxy status before start under production mode
  if (process.env.NODE_ENV?.trim() === 'production') {
    await checkProxyStatus()
  }
  // initiate browser instance
  await initiateBrowser()

  // health check
  app.get('/', async (req: Request, res: Response) => {
    // production mode health check
    if (process.env.NODE_ENV?.trim() === 'production') {
      await checkProxyStatus()
    }
    res.status(200).send()
  })

  // connect routes
  app.use('/', api)

  // disallow unknown request methods
  app.all('*', (req: Request, res: Response) => {
    res.status(403).send(`Forbidden: ${req.method} ${req.url}`)
  })

  // start crawler
  const PORT = process.env.SERVICE_PORT || 20000
  app.listen(PORT, () => {
    log.info(`Crawler running on ${PORT}`)
  })
})()
