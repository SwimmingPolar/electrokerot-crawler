import HttpsProxyAgent from 'https-proxy-agent'
import fetch from 'node-fetch'
import { log } from '../utils'
import { CrawlerInternalError } from '../helper'

type ProxyStatus = 'Healthy' | 'Unhealthy'

export async function proxyHealthCheck({
  exitOnError
}: { exitOnError?: boolean } = {}): Promise<ProxyStatus> {
  try {
    const response = await fetch('https://www.danawa.com', {
      agent: HttpsProxyAgent('http://localhost:8118')
    })

    if (!response.ok) {
      throw CrawlerInternalError()
    }

    return 'Healthy'
  } catch (error) {
    log.error('ProxyStatus', 'Proxy is not usable')
    if (exitOnError) {
      process.exit(1)
    }
    return 'Unhealthy'
  }
}
