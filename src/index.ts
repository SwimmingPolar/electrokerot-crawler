import dotenv from 'dotenv'
import express, { Request, Response } from 'express'
import api from './api'
import { errorHandler, initiateBrowser, proxyHealthCheck } from './helper'
import bodyParser from './middlewares/bodyParser'
import { log } from './utils'
if (process.env.NODE_ENV?.trim() === 'development') {
  dotenv.config({
    path: 'config/dev.env'
  })
}

const app = express()
app.use(bodyParser)
;(async () => {
  // check proxy status before start under production mode
  if (process.env.NODE_ENV?.trim() === 'production') {
    await proxyHealthCheck({ exitOnError: true })
  }
  // initiate browser instance
  await initiateBrowser()

  // health check
  app.get('/', async (req: Request, res: Response) => {
    return res.status(200).send()
  })

  // connect routes
  app.use('/', api)

  // disallow unknown request methods
  app.all('*', (req: Request, res: Response) => {
    return res.status(403).send(`Forbidden: ${req.method} ${req.url}`)
  })

  app.use(errorHandler)

  // start crawler
  const PORT = process.env.SERVICE_PORT?.trim() || 20000
  app.listen(PORT, () => {
    log.info(`Crawler running on ${PORT}`)
  })
})()
