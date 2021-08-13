import Product from '../../entities/product'
import Scraper from '../../interfaces/scraper'
import screenPage from '../../utils/capture'

const scraper: Scraper = async (request, page) => {
  page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.75 Safari/537.36',
  )

  let itemGroupId = request.pageUrl.split('?')[0].split('-').slice(-1)
  console.log({ itemGroupId })

  await page.goto(request.pageUrl)
  await page.waitForSelector('.product-title-main-header')

  const data = await page.evaluate(() => {
    let title = document.querySelector('.product-title-main-header')?.textContent?.trim() || ''
    let subtitle = document.querySelector('.short-description')?.textContent?.trim() || ''

    let swatch = Array.prototype.map.call(
      document.querySelectorAll('.product-swatches input'),
      el => ({
        ...Object.assign({}, el.dataset),
      }),
    )

    let options = Array.prototype.map
      .call(document.querySelectorAll('select[name="sku"] option'), el => ({
        idx: el.value,
        ...Object.assign({}, el.dataset),
      }))
      .slice(1)

    options = options.map(op => ({
      //@ts-ignore
      ...op,
      //@ts-ignore
      ...swatch.find(s=>s.swatch===op.swatch),
    }))

    options = options.map(op => ({
      //@ts-ignore
      ...op,
      //@ts-ignore
      ...productPrices[op.productid].items[op.idx]
    }))

    // @ts-ignore
    let breadcrumbs = document.querySelector('.breadcrumbs ol').innerText.split('\n')

    return {
      title,
      subtitle,
      breadcrumbs,
      options,
    }
  })

  console.log(data)
  // console.log(data.options);

  const products = [new Product('1', data.title, request.pageUrl)]

  const screenshot = await screenPage(page)

  // cookies & cache
  const client = await page.target().createCDPSession()
  await client.send('Network.clearBrowserCookies')
  await client.send('Network.clearBrowserCache')

  return {
    screenshot,
    products,
  }
}

export default scraper
