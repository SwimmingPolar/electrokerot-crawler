import { Request, Response, Router } from 'express'
// user defined
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
    res: Response
  ) => {
    try {
      const scrapPagesRequestBody = req.body
      const { scrapedPages, items } = await requestScrapPages(
        scrapPagesRequestBody
      )

      const { pages: requestedPages } = req.body

      // if nothing is scraped then it's an error
      if (requestedPages.length !== 0 && scrapedPages.length === 0) {
        res.status(500).json({
          error: 'Crawler internal error'
        })
        return
      }

      // see if completely or partially scraped
      if (requestedPages.length !== scrapedPages.length) {
        res.status(206)
      } else {
        res.status(200)
      }

      res.json({
        scrapedPages,
        items
      })
    } catch (error) {
      log.error('ScrapPages', error + '')
      res.status(500).json({
        error: 'Crawler internal error'
      })
    }
  }
)

export default router
