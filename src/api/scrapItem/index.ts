import { Router, Request, Response } from 'express'
// user defined
import { RequestDone } from '../../middlewares/requestLimiter'
import requestScrapItem from './scrapItem.helper'
import { log } from '../../utils'

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
      const scrapedResult = await requestScrapItem(helperParams)
      res.status(200).json(scrapedResult)
    } catch (error) {
      log.error('ScrapItem', error + '')
      console.log(error)
      res.status(500).json({
        error: 'Crawler internal error'
      })
    } finally {
      RequestDone()
    }
  }
)

export default router
