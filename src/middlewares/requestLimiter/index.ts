import { Request, Response, NextFunction } from 'express'

const { lockRequest, unlockRequest, isLocked } = (function () {
  let lock = false
  return {
    lockRequest: () => (lock = true),
    unlockRequest: () => (lock = false),
    isLocked: () => lock
  }
})()

// Crawler can only process single scrapping job at a time
function requestLimiter(req: Request, res: Response, next: NextFunction) {
  if (isLocked()) {
    res.json({
      isBusy: true
    })
    return
  }

  // lock current crawler
  lockRequest()

  // unlock when scrapping is done
  res.on('close', unlockRequest)

  next()
  return
}

export default requestLimiter
