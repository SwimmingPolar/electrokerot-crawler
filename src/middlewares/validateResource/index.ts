import { Request, Response, NextFunction } from 'express'
import { AnyZodObject, ZodError } from 'zod'

const validateResource =
  (schema: AnyZodObject) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body)
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json(error)
      }
    }
    next()
  }

export default validateResource

export { default as ScrapPagesSchema } from './schema/ScrapPagesSchema'
export { default as ScrapItemSchema } from './schema/ScrapItemSchema'
