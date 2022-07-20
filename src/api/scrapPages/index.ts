import fs from 'fs'
import { Router, Request, Response } from 'express'
import { getPage } from 'utils/puppeteerHelper'

interface ScrappedPagesResult {
  scrappedPages: string[]
  items: {
    name: string
    page: string
    nth: string
    variantsList: {
      tag: string
      pcode: string
      stock: boolean
    }[]
  }[]
}

const router = Router()

router.use('/', async (req: Request, res: Response) => {
  const pages = ['1', '11', '2']
  const { optionFilters, categoryNumber } = getFilters()

  /**
   * INITIALIZE variables
   */
  const page = await getPage()
  page.on('console', msg => console.log('page log: ' + msg.text()))
  const { scrappedPages = [], items = [] } = {} as ScrappedPagesResult

  /**
   * GOTO the target page
   */
  await page.goto(`https://prod.danawa.com/list/?cate=${categoryNumber}`)

  /**
   * BLOCK unnecessary requests
   */
  await page.setRequestInterception(true)
  page.on('request', request => {
    if (
      request.url() ===
      'https://prod.danawa.com/list/ajax/getProductList.ajax.php'
    ) {
      request.continue()
    } else {
      request.abort()
    }
  })

  /**
   * APPLY optional filters
   */
  if (optionFilters.length >= 1) {
    // disable javascript to prevent redundant http requests
    await page.setOfflineMode(true)

    optionFilters.forEach(async (filter, index) => {
      // enable javascript to fetch the last request
      if (optionFilters.length - 1 === index) {
        await page.waitForTimeout(1500)
        await page.setOfflineMode(false)
      }

      await page.evaluate(filter => {
        const checkbox = document.querySelector(filter) as HTMLInputElement
        checkbox?.click()
      }, filter)
    })
  }

  /**
   * LOOP through given page indexes
   *      to extract items info from the target page
   */
  do {
    const pageIndex = pages.shift() as string

    /**
     * MOVE to target page
     *      To listen for ajax update,
     *      delete content and wait for element to show up
     */
    const contentSelector = '.main_prodlist.main_prodlist_list'
    await page.evaluate(
      (pageIndex, selector) => {
        ;(document.querySelector(`${selector}`) as HTMLDivElement).remove()
        eval(`movePage(${pageIndex})`)
      },
      pageIndex,
      contentSelector
    )
    await page.waitForSelector(contentSelector)

    const result = await page.evaluate(pageIndex => {
      const items: ScrappedPagesResult['items'] = []

      /**
       * GET items list on the page
       */
      const pageItems = Array.from(
        document.querySelectorAll('.prod_item.prod_layer[id^=productItem]')
      )

      /**
       * EXTRACT info from the given item
       */
      pageItems.forEach((item, nth) => {
        const name =
          item.querySelector('.prod_name a')?.textContent?.trim() || ''

        const variants =
          Array.from(item.querySelectorAll('.prod_pricelist li')) || []

        const variantsList = variants.map(variant => {
          // EXTRACT tag
          const tag = Array.from(
            (variant.querySelector('.memory_sect') as HTMLDivElement)
              ?.childNodes || []
          )
            .reduce(
              (text, current) =>
                current.nodeType === 3
                  ? text + current.textContent?.trim()
                  : text,
              ''
            )
            .trim()

          const priceTag = variant.querySelector(
            '.price_sect > a'
          ) as HTMLAnchorElement

          // EXTRACT pcode
          const pcode =
            priceTag
              .getAttribute('href')
              ?.match(/pcode=([0-9]*)(?=&)/)
              ?.at(1) || ''

          // EXTRACT stock
          const stock = priceTag?.innerText.replace(/[^0-9]/gi, '').length > 0

          return {
            tag,
            pcode,
            stock
          }
        })

        items.push({
          name,
          variantsList,
          page: pageIndex,
          nth: nth + ''
        })
      })
      console.table(items)
      return items
    }, pageIndex)

    /**
     * SAVE concat scrapped info to the list
     * SAVE scrapped page index
     */
    items.push(...result)
    scrappedPages.push(pageIndex)

    await page.waitForTimeout(5000)
  } while (pages.length > 0)
})

export default router

interface OptionFilter {
  name: string
  type: string
  value: string
}

interface Category {
  category: string
  categoryNumber: string
  start: string
  end?: string
  range?: string[]
  filters: OptionFilter[]
}

interface ScrapConfig {
  baseUrl: string
  minimumDate?: Date
  ignoreWords?: string[]
  categories: Category[]
}

function getFilters() {
  const file = fs.readFileSync('config/scrapConfig.json', {
    encoding: 'utf8'
  })
  const config: ScrapConfig = JSON.parse(file)

  const { filters, categoryNumber } = config.categories[5]

  const optionFilters = filters.map(
    ({ type, value }) =>
      `${type === 'maker' ? '#searchMaker' : '#searchAttributeValue'}${value}`
  )

  return { optionFilters, categoryNumber }
}
