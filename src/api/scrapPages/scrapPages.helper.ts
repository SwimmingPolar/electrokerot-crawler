import { ScrapPagesRequestBody } from '.'
import { getPage } from '../../helper'
import { retry } from '../../utils'

type ScrapPagesParams = ScrapPagesRequestBody

interface ScrapPagesResult {
  scrapedPages: string[]
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

const TIMEOUT = 60000

export default async function ({
  url,
  minimumDate = '',
  ignoreWords = [],
  filters = [],
  pages
}: ScrapPagesParams): Promise<ScrapPagesResult> {
  const page = await getPage()
  const { scrapedPages = [], items = [] } = {} as ScrapPagesResult

  try {
    /**
     * GOTO the target page
     */
    const goto = async () => {
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: TIMEOUT
      })
    }
    await retry(goto, 3)()

    /**
     * APPLY optional filters
     */
    if (filters && filters.length > 0) {
      // open filters
      await page.waitForSelector(
        '#frmProductList > div.option_nav > div.nav_header > div.head_opt > button',
        {
          timeout: TIMEOUT
        }
      )
      await page.click(
        '#frmProductList > div.option_nav > div.nav_header > div.head_opt > button'
      )
      await page.waitForSelector('#extendSearchOptionpriceCompare', {
        timeout: TIMEOUT
      })
      // disconnect network to prevent redundant http requests
      await page.setOfflineMode(true)
      filters.forEach(async (filter, index) => {
        // re-establish network connection
        if (filters.length - 1 === index) {
          await page.waitForTimeout(1500)
          await page.setOfflineMode(false)
        }

        await page.evaluate(filter => {
          const checkbox = document.querySelector<HTMLInputElement>(filter)
          checkbox?.click()
        }, filter)
      })
    }

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
     * LOOP through given page indexes
     *      to extract items info from the target page
     */
    // pages is attached req.body so detach it before mutating
    pages = [...pages]
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
          document.querySelector<HTMLDivElement>(`${selector}`)?.remove()
          eval(`movePage(${pageIndex})`)
        },
        pageIndex,
        contentSelector
      )
      await page.waitForSelector(contentSelector, {
        timeout: TIMEOUT
      })

      const result = await page.evaluate(
        ({ pageIndex, minimumDate, ignoreWords }) => {
          // 'items' will hold data for 'result'
          const items: ScrapPagesResult['items'] = []

          /**
           * GET items list on the page
           */
          const pageItems =
            Array.from(
              document.querySelectorAll(
                '.prod_item.prod_layer[id^=productItem]'
              )
            ) || []

          /**
           * EXTRACT info from the given item
           */
          pageItems.forEach((item, nth) => {
            /**
             * IGNORE item with ignore words
             */
            // if no registration date, ignore
            const registrationDate =
              item
                .querySelector('.meta_item.mt_date dd')
                ?.textContent?.match(/\d{4}/)
                ?.at(0) || ''
            if (+registrationDate < +minimumDate) {
              return
            }

            // ignore if contains ignore words
            const includesIgnoreWords = (text: string) =>
              ignoreWords.some(word => text.includes(word))

            /**
             * EXTRACT name
             */
            const name =
              item.querySelector('.prod_name a')?.textContent?.trim() || ''
            if (includesIgnoreWords(name)) {
              return
            }

            const variants =
              Array.from(item.querySelectorAll('.prod_pricelist li')) || []

            /**
             * EXTRACT variantsList
             */
            const isNotUndefined = <T>(x: T | undefined): x is T =>
              x !== undefined
            const variantsList = variants
              .map(variant => {
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
                if (includesIgnoreWords(tag)) {
                  return
                }

                const priceTag = variant.querySelector(
                  '.price_sect > a'
                ) as HTMLAnchorElement

                // EXTRACT pcode
                const pcode =
                  priceTag
                    ?.getAttribute('href')
                    ?.match(/pcode=([0-9]*)(?=&)/)
                    ?.at(1) || ''

                // EXTRACT stock
                const stock =
                  priceTag?.innerText.replace(/[^0-9]/gi, '').length > 0 ||
                  false

                return {
                  tag,
                  pcode,
                  stock
                }
              })
              .filter(isNotUndefined)

            items.push({
              name,

              variantsList,
              page: pageIndex,
              nth: nth + ''
            })
          })

          return items
        },
        { pageIndex, minimumDate, ignoreWords }
      )

      /**
       * SAVE concat scraped info to the list
       * SAVE scraped page index
       */
      items.push(...result)
      scrapedPages.push(pageIndex)

      await page.waitForTimeout(1500)
    } while (pages.length > 0)
  } finally {
    await page.close()

    // eslint-disable-next-line no-unsafe-finally
    return {
      scrapedPages,
      items
    }
  }
}
