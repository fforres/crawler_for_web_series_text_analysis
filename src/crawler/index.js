import url from 'url';
import http from 'http';
import https from 'https';
import Crawler from 'crawler';

const crawler = new Crawler({
    maxConnections: 10,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36",
    },
    referer:"http://transcripts.foreverdreaming.org/  ",
    callback : (error, res, done) => {
        if(error){
            console.log(error);
        }
        done();
    }
});

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
  crawler.queue([{
    uri: url,
    jQuery: true,
    callback: (error, res, done) => {
      if (error) {
        reject(error);
      } else {
        const $ = res.$;
        const linkler = [];
        $('.control-box.top .pagination a').each((i,el) => {
          linkler.push(el);
        })
        if(linkler.length > 1) {
          resolve(parseInt(linkler[linkler.length - 2].attribs.href.split('&start=')[1]) / 25);
        } else  {
          resolve(1);
        }
        resolve(1);

      }
      done();
    },
    rotateUA: true,
  }]);
})


export const openWebSite = (urlToCrawl) => new Promise((resolve, reject) => {
  // console.log("Starting to crawl", url);

  crawler.queue([{
    uri: urlToCrawl,
    jQuery: true,
    callback: (error, res, done) => {
      if (error) {
        reject(error);
      } else {
        const $ = res.$;
        const linkler = [];
        $('.topic-titles.row2 a.topictitle').each((i, el) => {
          linkler.push(el)
        });
        //Extracting links and names
        const arr = [];
        for(let i = 0; i < linkler.length; i++) {
          const href = url.resolve(urlToCrawl,linkler[i].attribs.href);
          const ob = { href, text: $(linkler[i]).text()};
          if(i !== 0 && ob.text.toLowerCase().lastIndexOf('transcript index') === -1) {
            arr.push(ob);
          }
        }
        resolve(arr); /// -- send arr in then as result
      }
      done();
    },
    rotateUA: true,
  }]);
})


export const crawlAndParseText = (chapterData) => new Promise((resolve, reject) => {
  // console.log('Start crawling: ', chapterData.text, chapterData.href);

  crawler.queue([{
    uri: chapterData.href,
    jQuery: true,
    callback: (error, res, done) => {
      if (error) {
        reject(error);
      } else {
        const $ = res.$;
        const texts = [];
        $('.postbody p').each((i, el) => {
          texts.push($(el).text());
        })
        const splitted = chapterData.text.split(' - ');
        const seasonChapter = splitted[0].split('x');
        resolve({
          data: texts,
          fullName: chapterData.text,
          chapterName: splitted[1],
          season: parseInt(seasonChapter[0]),
          chapter: parseInt(seasonChapter[1])
        })

      }
      done();
    },
    rotateUA: true,
  }]);
})

export const start = (startingUrl) => {
  const parsedUrl = url.parse(startingUrl, true);
  // crawlAndParseText({
  //   href:'http://transcripts.foreverdreaming.org/viewtopic.php?f=172&t=30915&sid=4d01ecf642c22c4242ae50656d4d15cf',
  //   text: '05x12 - Bratva'
  // })
  // .then(rawData => {
  //   console.log(require('util').inspect(rawData, { depth: null }));
  // })
  // .catch(err => console.error(err));
  //
  //
  return getPagesToCrawl(parsedUrl.href)
    .then((pagesToCrawl) => {
      console.log("We'll crawl", pagesToCrawl);
      const crawlingArr = pagesToCrawl.map(el => openWebSite(el));
      return Promise.all(crawlingArr);
    })
    .then(rawData => {
      const allChapters = rawData.reduce((el, newEl) => el.concat(newEl)).map(el => crawlAndParseText(el));
      return Promise.all(allChapters);
    })
    .catch(err => console.error(err))

}
