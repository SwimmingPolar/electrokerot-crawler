import { Router } from 'express'

import { default as scrapPages } from './scrapPages'
import { default as scrapItem } from './scrapItem'
import { default as scrapItems } from './scrapItems'

const router = Router()

router.get('/scrapPages', scrapPages)
router.get('/scrapItems', scrapItems)
router.get('/scrapItem', scrapItem)

export default router
