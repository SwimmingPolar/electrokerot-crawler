import { getPage } from '../../helper'

interface ScrapItemResult {
  name: string
  category: string
  pcode: string
  tag: string
  stock: boolean
  details: Record<
    string,
    {
      value: string
      type: string
    }
  >
  vendors: Record<
    string,
    {
      vendorName: string
      vendorCode: string
      url: string
      price: string
      card: string
      shippingCost: string
    }[]
  >
}

export default async function (url: string): Promise<ScrapItemResult> {
  /**
   * GET new page
   */
  const page = await getPage()

  try {
    /**
     * GOTO the target page
     */
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 100000
    })

    // wait for necessary elements to be loaded
    await Promise.all([
      page.waitForSelector("div[id='2DepthCategory'] .now a", {
        timeout: 100000
      }),
      page.waitForSelector(
        '#priceCompareArea div.diff_opt_area .cardSaleChkbox span a',
        {
          timeout: 100000
        }
      )
    ])
    // apply credit card discount
    await page.click(
      '#priceCompareArea div.diff_opt_area .cardSaleChkbox span a'
    )
    // wait for the discount to be applied
    await page.waitForResponse(
      response => {
        const targetUrl =
          'https://prod.danawa.com/info/ajax/getAllPriceCompareMallList.ajax.php'

        const url = response.url()
        const status = response.status()
        if (status === 200 && url === targetUrl) {
          return true
        }
        return false
      },
      {
        timeout: 100000
      }
    )

    // go to details section
    await page.waitForSelector('#bookmark_product_information_item > a', {
      timeout: 100000
    })
    await page.click('#bookmark_product_information_item > a')
    // wait for details section to load
    await page.waitForSelector('#productDescriptionArea tbody', {
      timeout: 100000
    })

    const result = await page.evaluate(
      (url, categories) => {
        /**
         * EXTRACT category
         */
        const categoryNumber =
          (
            document.querySelector(
              "div[id='2DepthCategory'] .now a"
            ) as HTMLAnchorElement
          )
            ?.getAttribute('href')
            ?.match(/=([0-9]*)$/)
            ?.at(1) || ''

        // allowed categories only
        const category = categories[categoryNumber]
        if (!category) {
          throw new Error(
            `unsupported category item, pcode: ${categoryNumber}, url: ${url}}`
          )
        }

        /**
         * EXTRACT name, tag, codeName
         */
        let name =
          document
            .querySelector(
              '#blog_content > div.summary_info > div.top_summary > h3'
            )
            ?.textContent?.trim() || ''
        const tags = name
          .match(/\(.*\)$/m)
          ?.at(0)
          ?.split(' ')
        // remove parens on both side (beginning/end)
        const tag = tags?.pop()?.replace(/^\(|\)$/gm, '') || ''
        const codeName =
          category === 'cpu'
            ? tags?.shift()?.replace(/^\(|\)$/gm, '') || ''
            : ''
        // remove tag/codename from the name
        if (codeName || tag) {
          const tagStartAt = name.search(codeName || tag)
          // -1 for unescaped parenthesis at the start of tag/codeName
          name = name.slice(0, tagStartAt - 1).trim()
        }

        /**
         * EXTRACT stock
         *
         */
        const stock = !document.querySelector(
          '#blog_content > div.summary_info > div.detail_summary > div.summary_left > div.lowest_area > div.no_data'
        )

        /**
         * EXTRACT pcode
         */
        const pcode =
          window.location.search.match(/pcode=([0-9]*)/)?.at(1) || ''

        /**
         * EXTRACT vendors
         */
        const allowedMarketTypes = {
          openMarket: '#OpenMarketMallListDiv',
          mall: '#AffiliateMallListDiv',
          credit: '#cardCashMallList',
          cash: '#cashMallList'
        }
        const marketsList = Object.values(allowedMarketTypes).map(selector =>
          document.querySelector(selector)
        )
        // vendorCodes under below markets will be saved
        const vendorCodedMarkets = ['credit', 'cash']

        const isNotUndefined = <T>(x: T | undefined): x is T => x !== undefined
        // const vendors: ScrapItemResult['vendors'] = marketTitles.reduce(
        const vendors = Object.keys(allowedMarketTypes).reduce(
          (allVendors, marketType, index) => {
            return {
              ...allVendors,
              [marketType]: Array.from(
                marketsList[index]?.querySelectorAll('.diff_item') || []
              )
                .map(itemDiv => {
                  const vendorName =
                    (itemDiv.querySelector('.d_mall img') as HTMLDivElement)
                      ?.getAttribute('alt')
                      ?.replace(/㈜|\(.*?\)/g, '') ||
                    itemDiv
                      .querySelector('.d_mall span.txt_logo')
                      ?.textContent?.trim() ||
                    ''

                  // extract vendor code on some conditions only
                  const vendorCode =
                    vendorCodedMarkets.includes(marketType) ||
                    itemDiv.querySelector('.npay')
                      ? itemDiv
                          ?.getAttribute('data-linkproduct')
                          ?.match(/^.*?(?=_)/m)
                          ?.at(0) || ''
                      : ''

                  const url =
                    itemDiv.querySelector('.d_buy a')?.getAttribute('href') ||
                    ''

                  // consider credit card discount applied on open market
                  const priceWithCreditCardDiscount =
                    itemDiv.querySelector('.d_dsc .card_line') ||
                    itemDiv.querySelector('.d_dsc .prc_line')
                  const price =
                    priceWithCreditCardDiscount
                      ?.querySelector('em')
                      ?.textContent?.replace(/[^0-9]/g, '') || ''
                  const card =
                    priceWithCreditCardDiscount?.querySelector('.txt')
                      ?.textContent || ''
                  const shippingCost =
                    priceWithCreditCardDiscount
                      ?.querySelector('.ship')
                      ?.textContent?.replace(/[^0-9]/g, '') || ''
                  if (!price) {
                    return
                  }

                  return {
                    vendorName,
                    vendorCode,
                    url,
                    price,
                    card,
                    shippingCost
                  }
                })
                .filter(isNotUndefined)
            }
          },
          {} as ScrapItemResult['vendors']
        )

        /**
         * EXTRACT details
         */
        let subType = ''
        if (['graphics', 'cooler'].includes(category)) {
          subType =
            document
              .querySelector(
                '.top_summary .spec_set .spec_list a:nth-of-type(1)'
              )
              ?.textContent?.trim() || ''
        }
        const specTableRows = Array.from(
          document.querySelectorAll(
            '#productDescriptionArea .prod_spec table tbody tr'
          ) || []
        )
        const details: ScrapItemResult['details'] = {}
        let specType = '기본정보'
        let rowCount = 0
        do {
          const row = specTableRows[rowCount++]
          // if there's no details info
          if (!row) {
            break
          }

          if (row.childElementCount === 1) {
            specType = row.textContent?.trim() || ''
          } else {
            const specTitles = row.querySelectorAll('th.tit')
            const specDescription = row.querySelectorAll('td.dsc')

            specTitles.forEach((_, index) => {
              const fieldName = specTitles[index].textContent?.trim() || ''
              let value = specDescription[index].textContent?.trim() || ''

              // ignore if fieldName or value is empty
              if (!fieldName || !value) {
                return
              }

              // extra care for under some conditions
              if (fieldName === '제조회사') {
                value = value
                  .trim()
                  .replace(/\s/g, '')
                  .replace(/\(.*?\)/g, '')
              }
              if (specType === '쿨러 / 튜닝') {
                value = value.replace(/x\d*$/gm, '').trim()
              }

              details[fieldName] = {
                value,
                type: specType
              }
            })
          }
          // loop until empty string or '인증' row
        } while (
          rowCount < specTableRows.length &&
          ['', '인증'].some(f => !specType.includes(f))
        )

        // if codeName is not empty, add it to details
        if (codeName) {
          details['코드 네임'] = {
            value: codeName,
            type: '기본정보'
          }
        }
        // if subType is not empty, add it to details
        if (subType) {
          details['분류'] = {
            value: subType,
            type: '기본정보'
          }
        }

        return {
          name,
          category,
          pcode,
          tag,
          stock,
          vendors,
          details
        }
      },
      url,
      categories
    )

    // scraping delay
    await page.waitForTimeout(6000)

    return result
  } finally {
    /**
     * CLOSE opened tab
     */
    await page.close()
  }
}

const categories: Record<string, string> = {
  '112747': 'cpu',
  '112751': 'motherboard',
  '112752': 'memory',
  '112753': 'graphics',
  '112760': 'ssd',
  '112763': 'hdd',
  '112775': 'case',
  '112777': 'power',
  '11236855': 'cooler',
  '112798': 'cooler'
}
