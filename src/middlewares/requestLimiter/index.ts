import { NextFunction, Request, Response } from 'express'
import { syncSleep } from '../../utils'

const LIMIT = 7
let currentRequest = 0

let requestLock = 'unlocked'
export const RequestLock = () => (requestLock = 'locked')

const RequestTaken = () => currentRequest++
export const RequestDone = () => currentRequest--
export const CurrentRequest = () => currentRequest

const requestLimiter = (req: Request, res: Response, next: NextFunction) => {
  // if limit is reached,
  // send 503 and do not proceed
  if (requestLock === 'locked' || currentRequest >= LIMIT) {
    res.status(503).json({
      isBusy: true
    })
    return
  }
  // indicates that request is taken and will be processed
  RequestTaken()

  // throttle synchronously per valid request
  syncSleep(1000 + Math.random() * 500)

  next()
}

export default requestLimiter
