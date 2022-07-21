import { Router } from 'express'

import scrapPages from './scrapPages'
import scrapItem from './scrapItem'

const router = Router()

router.use('/scrapPages', scrapPages)
router.use('/scrapItem', scrapItem)

export default router
