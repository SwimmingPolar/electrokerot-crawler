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
  validateResource(ScrapPagesSchema),
  requestLimiter,
  scrapPages
)
router.use(
  '/scrapItem',
  validateResource(ScrapItemSchema),
  requestLimiter,
  scrapItem
)

export default router
