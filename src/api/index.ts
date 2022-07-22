import { Router } from 'express'

import scrapPages from './scrapPages'
import scrapItem from './scrapItem'
import validateResource, {
  ScrapPagesSchema,
  ScrapItemSchema
} from 'middlewares/validateResource'

const router = Router()

router.use('/scrapPages', validateResource(ScrapPagesSchema), scrapPages)
router.use('/scrapItem', validateResource(ScrapItemSchema), scrapItem)

export default router
