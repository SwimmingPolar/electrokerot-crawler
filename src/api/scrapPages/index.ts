import { Router, Request, Response } from 'express'
import helperScrapPages from 'api/scrapPages/helperScrapPages'
import log from 'utils/logger'

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
      const helperParams = req.body
      const { scrappedPages, items } = await helperScrapPages(helperParams)

      const { pages: requestedPages } = req.body

      // if nothing is scrapped then it's an error
      if (requestedPages.length !== 0 && scrappedPages.length === 0) {
        res.status(500).json({
          error: `Crawler can't scrap pages. See if html structure changed`
        })
        return
      }

      // see if completely or partially scrapped
      if (requestedPages.length !== scrappedPages.length) {
        res.status(206)
      } else {
        res.status(200)
      }

      res.json({
        scrappedPages,
        items
      })
    } catch (error) {
      res.status(500).json({
        error: 'Crawler internal error'
      })
    }
  }
)

export default router
