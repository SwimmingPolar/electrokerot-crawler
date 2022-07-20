import { Router, Request, Response } from 'express'
import { getPage } from 'utils/puppeteerHelper'

const router = Router()

router.use('/', async (req: Request, res: Response) => {
  const page = await getPage()
  await page.goto('https://example.com/&query=2')
})

export default router
