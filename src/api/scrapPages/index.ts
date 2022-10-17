import { NextFunction, Request, Response, Router } from 'express'
import { CrawlerInternalError } from '../../helper'
import { RequestDone } from '../../middlewares/requestLimiter'
import { log } from '../../utils'
import requestScrapPages from './scrapPages.helper'

const router = Router()

type Empty = Record<string, never>
export interface ScrapPagesRequestBody {
  url: string
  pages: string[]
  minimumDate?: string
  ignoreWords?: string[]
  filters?: string[]
}

router.post(
  '/',
  async (
    req: Request<Empty, Empty, ScrapPagesRequestBody, Empty>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const scrapPagesRequestBody = req.body
      const { scrapedPages, items } = await requestScrapPages(
        scrapPagesRequestBody
      )

      const { pages: requestedPages } = req.body

      // if nothing is scraped then there's something wrong puppeteer or network (proxy)
      if (requestedPages.length !== 0 && scrapedPages.length === 0) {
        return next(CrawlerInternalError())
      }

      // see if completely or partially scraped
      if (requestedPages.length === scrapedPages.length) {
        res.status(200)
      } else {
        res.status(206)
      }

      return res.json({
        scrapedPages,
        items
      })
    } finally {
      RequestDone()
    }
  }
)

export default router
