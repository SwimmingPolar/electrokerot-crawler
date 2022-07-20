import { Router } from 'express'

import scrapPages from './scrapPages'
import scrapItem from './scrapItem'

const router = Router()

router.post('/scrapPages', scrapPages)
router.post('/scrapItem', scrapItem)

export default router
