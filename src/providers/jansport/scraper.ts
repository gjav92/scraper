import Product from '../../entities/product'
import Scraper from '../../interfaces/scraper'
import screenPage from '../../utils/capture'
import { DESCRIPTION_PLACEMENT } from '../../interfaces/outputProduct'

const scraper: Scraper = async (request, page) => {
  await page.goto(request.pageUrl, { waitUntil: 'networkidle2' })
  
  const itemPrices = await page.evaluate(() => itemPrices)
  const catEntryId = await page.$eval("input[name='catEntryId']",(e: any)=> e.value)
  const attrName = await page.$eval("input[name='attrName']",(e: any)=> e.value)
  const baseURL = await page.$eval("link[rel='canonical']",(e: any)=> e.href)
  const productCode = await page.$eval("input[name='productCode']",(e: any)=> e.value)
  const description = await page.$eval(".desc-container",(e: any)=> e.textContent.trim() || '' )

  

  //If the product doesnt have any videos, the variable doesnt exists
  let videos=[]
  try{
    const wcsPDPVideoConfig = await page.evaluate(() => wcsPDPVideoConfig)
    //@ts-ignore
    wcsPDPVideoConfig.videos.forEach(d=>{videos.push(d.src)})
    videos=[...new Set(videos)]
  }
  catch(e){
    //pass
  }
  
  //Out of stock colors are identified by a classname
  const noStock = await page.$$eval('.out-of-stock', noStock =>
  noStock.map((p: any) => 
      p.getAttribute("data-attribute-value").toUpperCase()
    ),
  )

  //General values
  const prices=itemPrices[catEntryId].pricing[attrName]
  const currency = await page.$eval("meta[itemprop='priceCurrency']",(e: any)=> e.content)
  const brand = await page.$eval("meta[property='og:brand']",(e: any)=> e.content)
  const bullets = await page.$eval(".swatches-product-details-container",(e: any) => Array.from(e.querySelectorAll("li")).map((i: any)=> i.textContent))
  const sections = (await page.$$eval('.product-details-section', sections =>
    sections.map((section: any) => ({
        title: section.querySelector("h3").textContent,
        content: section.querySelector(".inner-content").innerHTML.trim()
    })),
     //@ts-ignore
     )).map(section => ({ ...section, description_placement: (section?.title == 'Details') ? DESCRIPTION_PLACEMENT.MAIN : DESCRIPTION_PLACEMENT.ADJACENT }))

  const breadcrumbs = await page.$$eval('.page-breadcrumb.breadcrumbs li', items =>
    items.map((e: any) => e.textContent?.split('—')[0]?.trim() || '').filter(s => s),
  )
  
  //Get variant data
  const variants = await page.$$eval('.color-swatch-button-content', variants =>
    variants.map((variant: any) => [{
        title: variant.getAttribute("data-product-name"),
        variationId: variant.getAttribute("data-variation-id"),
        color: JSON.parse(variant.getAttribute("data-product-data")).colorDescription,
        description: variant.getAttribute("data-product-desc")
    }]),
  )

  const products: Product[] = []
  for(const v of variants){
    for (const i of v){
      //Gather images
      await page.goto(`https://images.jansport.com/is/image/JanSport/${productCode}_${i.variationId}_set?req=set,json,UTF-8&labelkey=label&handler=s7sdkJSONResponse`)
      let jsonp=await (await page.content()).replace(',"");</pre></body></html>',"").replace('<html><head></head><body><pre style="word-wrap: break-word; white-space: pre-wrap;">/*jsonp*/s7sdkJSONResponse(','')
      let json=JSON.parse(jsonp).set.item
      let imgset=[]
      for(const iz in json){
        let ind
        try{ind=json[iz].i.n}catch{ind=json[iz].n} 
        
          if(ind){
            // @ts-ignore
            imgset.push(`https://images.jansport.com/is/image/${ind}?$VFDP-VIEWER-ZOOMVIEW-HERO$&wid=1003&hei=1166&fmt=jpg`)
          }
      }
      imgset=[...new Set(imgset)]
      
      //We need the color names in the price json to be uppercase so we can search for it, the color names we gather are in lowercase and the key values in the json are mixed lower/upper
      var key, keys = Object.keys(prices);
      var n = keys.length;
      var pricesl={}
      while (n--) {
        key = keys[n];
        pricesl[key.toUpperCase()] = prices[key];
      }
      let availability=true
      //const stock=noStock //Without this noStock ends up empty
      
      if(noStock.indexOf(i.color.toUpperCase())!=-1){
        availability=false
      }

      let color=i.color.toUpperCase()
      let title=i.title
      let highPrice=pricesl[color].highPriceNumeric
      let lowPrice=pricesl[color].lowPriceNumeric
      let sku=pricesl[color].sku
      let url=baseURL+"?variationId="+i.variationId
      let itemGroupId=productCode
      let sizeChartUrl=`http://widget.tangiblee.com/desktop/${productCode.toLowerCase()}-${i.variationId}?domain=www.jansport.com`

      const variant = new Product(
        productCode+"-"+i.variationId,
        title,
        url,
      )
        
      variant.description = description
      variant.brand = brand
      variant.currency = currency
      variant.realPrice = lowPrice
      variant.higherPrice = highPrice
      variant.sku = sku
      variant.itemGroupId = itemGroupId
      variant.color = color
      variant.breadcrumbs = breadcrumbs
      variant.bullets = bullets
      variant.availability = availability
      variant.images = imgset
      variant.videos = videos
      variant.sizeChartUrls=[sizeChartUrl]
      sections.map((section: any) => variant.addAdditionalSection(section))
      products.push(variant)  
    }
  }

  const screenshot = await screenPage(page)
  return {
    screenshot,
    products,
  }
}

export default scraper
