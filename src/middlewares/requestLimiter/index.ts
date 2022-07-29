import { Request, Response, NextFunction } from 'express'

const LIMIT = 3
let currentRequest = 0

const RequestTaken = () => currentRequest++
// every 'next' middleware should call this function to indicate that request is done
export const RequestDone = () => currentRequest--

const requestLimiter = (req: Request, res: Response, next: NextFunction) => {
  if (currentRequest >= LIMIT) {
    res.status(503).json({
      isBusy: true
    })
    return
  }
  // send 503 and do not proceed
  // indicates that request is taken and will be processed
  RequestTaken()

  // next function will have to call RequestDone to indicate that request is done
  // and release the request limiter for another request
  next()
}

export default requestLimiter
