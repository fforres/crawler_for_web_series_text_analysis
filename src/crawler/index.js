import url from 'url';
import http from 'http';
import https from 'https';
import parse5 from 'parse5';
import cheerio from 'cheerio';
import Nightmare from 'nightmare';

var Crawler = require("crawler");
var url = require('url');

var c = new Crawler({
    maxConnections : 10,
    // This will be called for each crawled page
    callback : function (error, res, done) {
        if(error){
            console.log(error);
        }else{
            var $ = res.$;
            // $ is Cheerio by default
            //a lean implementation of core jQuery designed specifically for the server
            console.log($("title").text());
        }
        done();
    }
});



const baseUrl = 'http://transcripts.foreverdreaming.org/viewforum.php?f='
const series = [{
  name: 'Arrow',
  id: 172
}, {
  name: 'Future-Worm',
  id: 386
}];


export const getPagesToCrawl  = (url) => {
  return getAmountOfPages(url)
  .then((pages) => new Promise((resolve, reject) => {
    const urlsToCrawl = [];
    urlsToCrawl.push(`${url}`)
    for (let i = 1; i <= pages; i++) {
      urlsToCrawl.push(`${url}&start=${25*i}`)
    }
    resolve(urlsToCrawl);
  }))
}


export const getAmountOfPages  = (url) => new Promise((resolve, reject) => {
  const nightmare = Nightmare();
  nightmare
    .goto(url)
    .inject('js', 'node_modules/jquery/dist/jquery.js')
    .evaluate(() => {
      //GETTING PAGES
      const linkler = $('.control-box.top .pagination a').each(() => {
        $(this).attr("href");
      });
      if(linkler.length > 1) {
        return linkler[linkler.length - 2].href.split('&start=')[1];
      } else  {
        return 1;
      }
    })
    .end()
    .then(function (results) {
      if(results > 1) {
        resolve(results/25)
      } else {
        resolve(results);
      }
    })
    .catch((e) => {
      reject(e)
    });
})


export const openWebSite = (url) => new Promise((resolve, reject) => {
  // console.log("Starting to crawl", url);
  const nightmare = Nightmare();
  nightmare
    .goto(url)
    .inject('js', 'node_modules/jquery/dist/jquery.js')
    .evaluate(() => {
      //Extracting links and names
      const arr = [];
      const linkler = $('.topic-titles.row2 a.topictitle').each(() => {
        $(this).attr("href");
      });
      for(let i = 0; i < linkler.length; i++) {
        const ob = { href: linkler[i].href, text: linkler[i].text };
        if(i !== 0 && ob.text.toLowerCase().lastIndexOf('transcript index') === -1) {
          arr.push({href: linkler[i].href, text: linkler[i].text});
        }
      }
      return arr; /// -- send arr in then as result
    })
    .end()
    .then(function (result) {
      // console.log('finished: ', url)
      resolve(result)
    })
    .then(_ => {
      nightmare.end();
      // kill the Electron process explicitly to ensure no orphan child processes
      nightmare.proc.disconnect();
      nightmare.proc.kill();
      nightmare.ended = true;
    })
    .catch((error) => {
      reject(error)
    })
})


export const crawlAndParseText = (chapterData) => new Promise((resolve, reject) => {
  console.log('Start crawling: ', chapterData.text);
  nightmare
    .goto(chapterData.href)
    .evaluate(() => {
      return [].slice.call(document.querySelectorAll('.postbody p')).map(el => el.textContent);
    })
    .end()
    .then((result) => {
      const splitted = chapterData.text.split(' - ');
      const seasonChapter = splitted[0].split('x');
      console.log('Finished crawling: ', chapterData.text);
      resolve({data: result, fullName: chapterData.text, chapterName: splitted[1], season: seasonChapter[0], chapter: seasonChapter[1]})
    })
    .catch((error) => {
      reject(error)
    })
    .then(_ => {
      nightmare.end();
      // kill the Electron process explicitly to ensure no orphan child processes
      nightmare.proc.disconnect();
      nightmare.proc.kill();
      nightmare.ended = true;
    })
})


export const parseData = (rawData) => {
  const $ = cheerio.load(rawData, {
    normalizeWhitespace: true,
    xmlMode: true
  });
}


export const start = () => {
  const parsedUrl = url.parse(`${baseUrl}${series[0].id}`, true);
  // crawlAndParseText('http://transcripts.foreverdreaming.org/viewtopic.php?f=172&t=10212&sid=ff277275f5cec8f78132930125a2f034')
  // .then(rawData => {
  //   console.log(require('util').inspect(rawData, { depth: null }));
  // })
  // .catch(err => console.error(err));
  getPagesToCrawl(parsedUrl.href)
    .then((pagesToCrawl) => {
      // console.log("We'll crawl", pagesToCrawl);
      const crawlingArr = pagesToCrawl.map(el => openWebSite(el));
      return Promise.all(crawlingArr);
    })
    .then(rawData => {
      const allChapters = rawData.reduce((el, newEl) => el.concat(newEl)).map(el => crawlAndParseText(el));
      return Promise.all(allChapters);
    })
    .then(everyChapterParsed => {
      console.log(require('util').inspect(everyChapterParsed.length, { depth: null }));
      console.log(require('util').inspect(everyChapterParsed, { depth: null }));
    })
    .catch(err => console.error(err))
}
