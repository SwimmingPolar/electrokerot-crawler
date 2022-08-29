import { Request, Response, NextFunction } from 'express'

const LIMIT = 7
let currentRequest = 0

const RequestTaken = () => currentRequest++
// every 'next' middleware should call this function to indicate that request is done
export const RequestDone = () => currentRequest--

const requestLimiter = (req: Request, res: Response, next: NextFunction) => {
  // if limit is reached,
  // send 503 and do not proceed
  if (currentRequest >= LIMIT) {
    res.status(503).json({
      isBusy: true
    })
    return
  }
  // indicates that request is taken and will be processed
  RequestTaken()

  // release limit after request is done
  res.once('finish', RequestDone)

  next()
}

export default requestLimiter
