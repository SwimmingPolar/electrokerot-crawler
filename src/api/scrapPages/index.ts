import { Router, Request, Response } from 'express'
import helperScrapPages from 'api/scrapPages/helperScrapPages'
import log from 'utils/logger'

const router = Router()

type Empty = Record<string, never>
export interface ScrapPagesRequestBody {
  url: string
  pages: string[]
  minimumDate?: Date
  ignoreWords?: string[]
  filters?: string[]
}

router.use(
  '/',
  async (
    req: Request<Empty, Empty, ScrapPagesRequestBody, Empty>,
    res: Response
  ) => {
    const helperParams = req.body
    helperParams.minimumDate =
      helperParams.minimumDate && new Date(helperParams.minimumDate)

    const { scrappedPages, items } = await helperScrapPages(helperParams)

    const { pages: requestedPages } = req.body
    // error
    if (requestedPages.length !== 0 && scrappedPages.length === 0) {
      res.status(500).json({
        error: 'Crawler internal error'
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
  }
)

export default router
