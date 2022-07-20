import { getPage } from 'utils/puppeteerHelper'
import log from 'utils/logger'
import { ScrapPagesRequestBody } from './index'

type ScrapPagesParams = ScrapPagesRequestBody

interface ScrapPagesResult {
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

export default async function ({
  url,
  minimumDate,
  ignoreWords,
  filters,
  pages
}: ScrapPagesParams): Promise<ScrapPagesResult> {
  const page = await getPage()
  const { scrappedPages = [], items = [] } = {} as ScrapPagesResult

  try {
    /**
     * GOTO the target page
     */
    await page.goto(url)

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
    if (filters && filters.length > 0) {
      // disconnect network to prevent redundant http requests
      await page.setOfflineMode(true)

      filters.forEach(async (filter, index) => {
        // re-establish network connection
        if (filters.length - 1 === index) {
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
        // 'items' will hold data for 'result'
        const items: ScrapPagesResult['items'] = []

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
  } catch (error) {
    log.error('ScrapPages', error + '')
  } finally {
    await page.close()

    // eslint-disable-next-line no-unsafe-finally
    return {
      scrappedPages,
      items
    }
  }
}
