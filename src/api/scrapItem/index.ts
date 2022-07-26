import { Router, Request, Response } from 'express'
import helperScrapItem from 'api/scrapItem/helper.scrapItem'
import log from 'utils/logger'
import { RequestDone } from 'middlewares/requestLimiter'

type Empty = Record<string, never>

export interface ScrapItemRequestBody {
  url: string
}

const router = Router()

router.post(
  '/',
  async (
    req: Request<Empty, Empty, ScrapItemRequestBody, Empty>,
    res: Response
  ) => {
    const helperParams = req.body

    try {
      const scrapedResult = await helperScrapItem(helperParams)
      res.status(200).json(scrapedResult)
    } catch (error) {
      log.error('ScrapItem', error + '')
      res.status(500).json({
        error: 'Crawler internal error'
      })
    } finally {
      RequestDone()
    }
  }
)

export default router
