import { NextFunction, Request, Response } from 'express'
import { CurrentRequest, RequestLock } from '../middlewares/requestLimiter'
import { log } from '../utils'
import { proxyHealthCheck } from '../helper'

let proxyRetries = 3

const crawlerInternalErrorMessage = 'internal error'
export const CrawlerInternalError = () => new Error(crawlerInternalErrorMessage)

export async function errorHandler(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (error && error?.message === crawlerInternalErrorMessage) {
    log.error('Crawler', crawlerInternalErrorMessage)
    res.status(500).json({
      error: crawlerInternalErrorMessage
    })

    // check proxy status only on production
    if (process.env.NODE_ENV?.trim() === 'production') {
      const status = await proxyHealthCheck({ exitOnError: false })
      if (status === 'Unhealthy') {
        proxyRetries--
        if (proxyRetries <= 0) {
          // do not take any more requests
          RequestLock()

          // wait for pending requests to finish
          await waitForPendingRequests()

          process.exit(1)
        }
      }
    }

    next()
  }
}

const waitForPendingRequests = () => {
  return new Promise<void>(resolve => {
    const interval = setInterval(() => {
      if (CurrentRequest() === 0) {
        clearInterval(interval)
        resolve()
      }
    }, 1000)
  })
}
