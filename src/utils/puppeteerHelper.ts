import { Browser, Page } from 'puppeteer'
import puppeteer from 'puppeteer-extra'
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import log from 'utils/logger'

let browser: Browser

puppeteer.use(AdblockerPlugin({ blockTrackers: true })).use(StealthPlugin())

export async function initiateBrowser() {
  try {
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      executablePath: puppeteer.executablePath(),
      args: ['--disable-dev-shm-usage', '--no-sandbox']
    })

    // re-open browser in case it crashes
    browser.on('disconnected', async () => {
      await initiateBrowser()
    })
  } catch (error) {
    log.error('puppeteerHelper', 'browser instantiating failure')
  }
}

export async function getBrowser() {
  if (!browser) {
    await initiateBrowser()
  }
  return browser
}

export async function getPage() {
  return await (await getBrowser()).newPage()
}
