import Product from '../../entities/product'
import Scraper from '../../interfaces/scraper'
import screenPage from '../../utils/capture'

const scraper: Scraper = async (request, page) => {
  await page.goto(request.pageUrl)

  const products = [new Product('id', 'title', 'url')]

  const screenshot = await screenPage(page)

  return {
    screenshot,
    products,
  }
}

export default scraper
