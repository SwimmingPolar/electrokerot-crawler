export function syncSleep(delay: number) {
  const now = Date.now()
  // eslint-disable-next-line no-empty
  while (Date.now() < now + delay) {}
}

export function asyncSleep(delay: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve()
    }, delay)
  })
}
