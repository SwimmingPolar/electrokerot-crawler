import { Browser, Page } from 'puppeteer'
import puppeteer from 'puppeteer-extra'
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import log from 'utils/logger'

let browser: Browser
let page: Page

puppeteer.use(AdblockerPlugin({ blockTrackers: true })).use(StealthPlugin())

export async function initiateBrowser() {
  try {
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      executablePath: puppeteer.executablePath()
    })

    page = (await browser.pages())[0]
  } catch (error) {
    log.error('puppeteerHelper', 'browser instantiating failure')
  }
}

export async function getBrowser() {
  if (!browser || !page) {
    await initiateBrowser()
  }
  return browser
}

export async function getPage() {
  if (!browser || !page) {
    await initiateBrowser()
  }
  return page
}
