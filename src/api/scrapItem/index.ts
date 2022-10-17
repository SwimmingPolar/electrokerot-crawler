import { NextFunction, Request, Response, Router } from 'express'
import { CrawlerInternalError } from '../../helper'
import { RequestDone } from '../../middlewares/requestLimiter'
import requestScrapItem from './scrapItem.helper'

type Empty = Record<string, never>

export interface ScrapItemRequestBody {
  url: string
}

const router = Router()

router.post(
  '/',
  async (
    req: Request<Empty, Empty, ScrapItemRequestBody, Empty>,
    res: Response,
    next: NextFunction
  ) => {
    const { url } = req.body

    try {
      const scrapedResult = await requestScrapItem(url)
      return res.status(200).json(scrapedResult)
    } catch (error) {
      // any error caught here have something to do with puppeteer or network (proxy)
      next(CrawlerInternalError())
    } finally {
      RequestDone()
    }
  }
)

export default router
