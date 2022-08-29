import { Request, Response, Router } from 'express'
import { log } from '../../utils'
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
    res: Response
  ) => {
    const { url } = req.body

    try {
      const scrapedResult = await requestScrapItem(url)
      res.status(200).json(scrapedResult)
    } catch (error) {
      log.error('ScrapItem', error + '')
      res.status(500).json({
        error: 'Crawler internal error'
      })
    }
  }
)

export default router
