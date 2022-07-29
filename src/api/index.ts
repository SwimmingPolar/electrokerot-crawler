import { Router } from 'express'

import validateResource, {
  ScrapPagesSchema,
  ScrapItemSchema
} from '../middlewares/validateResource'
import requestLimiter from '../middlewares/requestLimiter'

import scrapPages from './scrapPages'
import scrapItem from './scrapItem'

const router = Router()

router.use(
  '/scrapPages',
  requestLimiter,
  validateResource(ScrapPagesSchema),
  scrapPages
)
router.use(
  '/scrapItem',
  requestLimiter,
  validateResource(ScrapItemSchema),
  scrapItem
)

export default router
