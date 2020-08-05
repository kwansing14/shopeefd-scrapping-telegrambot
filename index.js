require('dotenv').config()

const Extra = require('telegraf/extra')
const {Telegraf, Router, Markup} = require('telegraf')
const puppeteer = require('puppeteer');

const bot = new Telegraf(process.env.TOKEN)

//global variable
let date;
let selection = null;

async function getDate() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  //access flash deal page
  await page.goto('https://shopee.sg/flash_deals');
  //let all pages to be loaded
  await page.waitFor(2000);

  //dates of flashdeals
  date = await page.evaluate(() => {
    let data=[]
    let pagesquery = document.querySelectorAll('.flash-sale-session');
    for (let x of pagesquery) {
      let sub = x.innerText.substring(0,5);
      data.push(sub)
    }
    return (data);
  })
}

async function accessPuppeteer() {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();

  //access flash deal page
  await page.goto('https://shopee.sg/flash_deals');

  //let all pages to be loaded
  await page.waitFor(2000);

  //page2click
  if( selection != 0 ) {
    const page2click = await page.evaluate( async() => {
      let pagesquery = document.querySelectorAll('.flash-sale-session');
      await pagesquery[selection].click()
    })
  }

  await autoScroll(page);

  //page1
  const list = await page.evaluate(() => {
    let data = []
    const list = document.querySelectorAll('.flash-sale-item-card__item-name');
    for (let title of list) {
      data.push(title.innerText)
    }
    return data;
  })

  await browser.close();
  console.log('closed')
  return list;
};

async function autoScroll(page){

  await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
      var totalHeight = 0;
      var distance = 100;
      var timer = setInterval(() => {
        var scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if(totalHeight >= scrollHeight){
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

function compare(x, y){
  let results = [];
  console.log('comparing')
  console.log(x)
  for (element of y) {
    if((element.toLowerCase()).includes(x.toLowerCase())) {
      console.log('found')
      results.push(element);
    }
  }
  return results;
}

//Bot command
bot.command('check', async (ctx) => {
  if (selection === null) {
    ctx.reply('please type /shopee to select time')
    return;
  }

  ctx.reply('Checking flashdeals')
  console.log(ctx.message.text)

  //extract msg
  let temp = ctx.message.text
  let check = temp.substring(7);

  if(/[^a-zA-Z]+$/.test(check)) {
    ctx.reply('Please use a valid item name')
    return;
  }
  if(check.length<3){
    ctx.reply('Please enter character more than 2')
    return;
  }
  await console.log(selection)

  //access puppeteer
  let pup = await accessPuppeteer()
  let comp = await compare(check, pup)
  let ren = '';
  comp.forEach((ele,value) => {
    ren += (parseInt(value)+1)+'. '+ele+'\n';
  })
  await ctx.reply('Flash deals starts @ '+date[selection]+'\n'+
    ren+'done')

})

bot.action('1', (ctx) => {
  selection = 0;
  ctx.reply('You have selected '+date[0]+'\n'+
    'Type /check<space><items_name>')
})

bot.action('2', (ctx) => {
  selection = 1;
  ctx.reply('You have selected '+date[1]+'\n'+
    'Type /check<space><items_name>')
})

bot.action('3', (ctx) => {
  selection = 2;
  ctx.reply('You have selected '+date[2]+'\n'+
    'Type /check<space><items_name>')
})

bot.command('shopee', async(ctx) => {
  ctx.reply('Checking flash deals timing....')
  await getDate()
  const inlineMessageRatingKeyboard = Markup.inlineKeyboard(
    [
      [ Markup.callbackButton(date[0], '1') ],
      [ Markup.callbackButton(date[1], '2') ],
      [ Markup.callbackButton(date[2], '3') ]
    ]
  ).extra()
  await ctx.reply('Select flash deals timing',inlineMessageRatingKeyboard)
})

bot.start((ctx) => ctx.reply('Use /shopee to start'))

bot.launch()