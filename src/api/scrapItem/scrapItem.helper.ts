import { PuppeteerHelper, randomUserAgent } from '../../utils'
import { ScrapItemRequestBody } from '.'

type ScrapItemParams = ScrapItemRequestBody

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
  vendors: {
    marketType: string
    vendorsList: {
      vendorName: string
      vendorCode: string
      url: string
      price: string
    }[]
  }[]
}

export default async function ({
  url
}: ScrapItemParams): Promise<ScrapItemResult> {
  /**
   * GET new page
   */
  const page = await PuppeteerHelper.getPage()

  try {
    await page.setUserAgent(randomUserAgent())
    /**
     * GOTO the target page
     */
    await page.goto(url, {
      timeout: 120000,
      waitUntil: 'networkidle2'
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
        const allowedMarketTypes = [
          '오픈마켓',
          '백화점 / 홈쇼핑 / 종합몰',
          '카드/현금 동일 전문몰',
          '일반 전문몰'
        ]
        // vendorCodes under below markets will be saved
        const vendorCodedMarkets = ['카드/현금 동일 전문몰', '일반 전문몰']
        const marketTitles =
          Array.from(
            document.querySelectorAll('#priceCompareArea .diff_tit')
          ) || []
        const marketContents =
          Array.from(
            document.querySelectorAll(
              '#priceCompareArea .diff_cont:not(.diff_cont .diff_cont)'
            )
          ) || []

        const isNotUndefined = <T>(x: T | undefined): x is T => x !== undefined
        const vendors: ScrapItemResult['vendors'] = marketTitles
          .map((div, index) => {
            // skip not-allowed markets
            const marketType = allowedMarketTypes.find(allowedType =>
              div.textContent?.trim()?.includes(allowedType)
            )
            if (!marketType) {
              return
            }

            return {
              marketType,
              vendorsList: Array.from(
                marketContents[index].querySelectorAll('.diff_item') || []
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

                  const price =
                    itemDiv
                      .querySelector('.d_dsc .prc_line .price')
                      ?.textContent?.replace(/[^0-9]/g, '') || ''
                  if (!price) {
                    return
                  }

                  return {
                    vendorName,
                    vendorCode,
                    url,
                    price
                  }
                })
                .filter(isNotUndefined)
            }
          })
          .filter(isNotUndefined)

        /**
         * EXTRACT details
         */
        const specTableRows = Array.from(
          document.querySelectorAll(
            '#productDescriptionArea .prod_spec table tbody tr'
          ) || []
        )
        //
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

        return {
          name,
          category,
          pcode,
          codeName,
          tag,
          stock,
          vendors,
          details
        }
      },
      url,
      categories
    )

    await page.waitForTimeout(5000)

    return result
  } finally {
    /**
     * CLOSE opened tab
     */
    await page.close()
  }
}

const categories: Record<string, string | undefined> = {
  '112747': 'cpu',
  '112751': 'mainboard',
  '112752': 'memory',
  '112753': 'graphics',
  '112760': 'ssd',
  '112763': 'hdd',
  '112775': 'case',
  '112777': 'power',
  '11236855': 'cooler',
  '112798': 'cooler'
}
