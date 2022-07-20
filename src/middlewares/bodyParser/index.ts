import express, { Router, Request, Response, NextFunction } from 'express'

const bodyParser = Router()

bodyParser.use(express.json())
bodyParser.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err.type === 'entity.parse.failed' && err.statusCode === 400) {
    return res.status(400).send({
      error: 'Invalid JSON format'
    })
  }
  return next()
})

export default bodyParser
