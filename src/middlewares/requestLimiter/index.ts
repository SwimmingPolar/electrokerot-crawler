import { Request, Response, NextFunction } from 'express'

const requestLimiter = (function () {
  const LIMIT = 1
  let currentRequest = 0
  return (req: Request, res: Response, next: NextFunction) => {
    if (currentRequest >= LIMIT) {
      res.status(503).json({
        isBusy: true
      })
      return
    }
    currentRequest++

    res.on('close', () => {
      currentRequest--
    })

    next()
    return
  }
})()

export default requestLimiter
