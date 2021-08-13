import Product from '../../entities/product'
import Scraper from '../../interfaces/scraper'
import screenPage from '../../utils/capture'

const scraper: Scraper = async (request, page) => {
  page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.75 Safari/537.36',
  )

  let itemGroupUrl = request.pageUrl
  let itemGroupId = request.pageUrl.split('?')[0].split('-').slice(-1)

  await page.goto(request.pageUrl)

  const data = await page.evaluate(() => {

    let title = document.querySelector('.product-title-main-header')?.textContent?.trim() || ''
    let subtitle = document.querySelector('.short-description')?.textContent?.trim() || ''

    // @ts-ignore
    let currency = document.querySelector('.open-currency-selection-modal span').textContent.split('(')[1].split(')')[0]

    // @ts-ignore
    let breadcrumbs = document.querySelector('.breadcrumbs ol').innerText.split('\n')

    let options = Array.prototype.map
      .call(document.querySelectorAll('select[name="sku"] option'), el => ({
        idx: el.value,
        ...Object.assign({}, el.dataset),
      }))
      .slice(1)

    let swatch

    // @ts-ignore
    let firstSwatch = options[0].swatch
    // @ts-ignore
    if (options.find(o => o.swatch !== firstSwatch)) {
      swatch = Array.prototype.map.call(
        document.querySelectorAll('.product-swatches input'),
        el => ({
          ...Object.assign({}, el.dataset),
        }),
      )
    } else {
      swatch = [
        {
          // @ts-ignore
          productid: Object.keys(productCatalog)[0],
          swatch: firstSwatch,
          producturl: null
        },
      ]
    }

    swatch = swatch.map(sw => {

      //@ts-ignore
      let p = productCatalog[sw.productid]
      let kv = p.productAttrsComplex.FiberContent
      let keyValues = {}

      // check for .value (str) or .values []
      if( kv.value ) {
          let [key, value] = kv.value.split(':')
          keyValues[key] = value
      } else {
        //@ts-ignore
        for (let pairs of p.productAttrsComplex.FiberContent.values) {
          let [key, value] = pairs.value.split(':')
          keyValues[key] = value
        }
      }

      return {
        //@ts-ignore
        ...sw,
        sizeChartUrls: [`https://www.hollisterco.com/api/ecomm/h-wd/product/sizeguide/${p.sizeChartName}`],
        description: p.longDesc,
        keyValuePairs: keyValues,
        bullets: p.productAttrsComplex.CareInstructions.values.map(o => o.value),
        //@ts-ignore
        images: Object.values(productCatalog[sw.productid].imageSets)
          .flat()
          //@ts-ignore
          .filter(o => o.id)
          //@ts-ignore
          .map(o => `https://img.hollisterco.com/is/image/anf/${o.id}?policy=product-large`),
      }

    })

    options = options.map(op => ({
      //@ts-ignore
      ...op,
      //@ts-ignore
      ...swatch.find(s => s.swatch === op.swatch),
    }))

    options = options.map(op => ({
      //@ts-ignore
      ...op,
      //@ts-ignore
      ...productPrices[op.productid].items[op.idx],
    }))

    return {
      options,
      title,
      subtitle,
      breadcrumbs,
      currency,
    }
  })


  data.options = data.options.map(op=>({
    // @ts-ignore
    ...op,
    // @ts-ignore
    producturl: ( op.producturl === null ) ? itemGroupUrl : new URL(itemGroupUrl).hostname + op.producturl
  }))

  console.dir(data, { depth: null });

  const products = []

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
