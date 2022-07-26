// npm packages
import dotenv from 'dotenv'
dotenv.config({
  path: 'config/dev.env'
})
import express, { Request, Response } from 'express'
// user defined
import bodyParser from 'middlewares/bodyParser'
import requestLimiter from 'middlewares/requestLimiter'
import { log, PuppeteerHelper } from 'utils'
import api from './api'

const app = express()
app.use(bodyParser)
;(async () => {
  // initiate browser instance
  await PuppeteerHelper.initiateBrowser()

  // health check
  app.get('/', (req: Request, res: Response) => {
    res.status(200).send()
  })

  // connect routes
  app.use('/', requestLimiter, api)

  // disallow unknown request methods
  app.all('*', (req: Request, res: Response) => {
    res.status(403).send(`Forbidden: ${req.method} ${req.url}`)
  })

  // start crawler
  const PORT = process.env.PORT || 20000
  app.listen(PORT, () => {
    log.info(`Crawler running on ${PORT}`)
  })
})()
