const fs = require('fs');
const parse = require('csv-parse');
const stringify = require('csv-stringify');
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const crawler = require('crawler');

const replaceSpecialCharacters = (text) => text.replace(/[\n]/g, '').replace(/  +/g, ' ').trim();
const input = [];
const output = [];

const createRecords = async input => {
    const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
    const options = {
        //logLevel: 'info',
        port: chrome.port,
        strategy: "mobile",
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo']
    };

    for (var i in input) {
        const result = await lighthouse(input[i].uri, options);
        output.push({
            'id': input[i].id,
            'company': input[i].company,
            'salesperson': input[i].salesperson,
            'region': input[i].region,
            'url': input[i].uri,
            'version': input[i].version,
            'title': input[i].title,
            'performance': result.lhr.categories.performance.score ? (result.lhr.categories.performance.score * 100).toFixed(0) : 'NA',
            'accessibility': result.lhr.categories.accessibility.score ? (result.lhr.categories.accessibility.score * 100).toFixed(0) : 'NA',
            'best-practices': result.lhr.categories['best-practices'].score ? (result.lhr.categories['best-practices'].score * 100).toFixed(0) : 'NA',
            'seo': result.lhr.categories.seo.score ? (result.lhr.categories.seo.score * 100).toFixed(0) : 'NA'
        });
    }

    await chrome.kill();
    stringify(output, { header: true }, (err, data) => {
        if (err) {
            console.log(err);
        } else {
            fs.writeFile(__dirname + '/output.csv', data, (err, result) => {
                if (err) {
                    console.log(err);
                } else {
                    console.log('Success!');
                }
            });
        }
    });
};

const crawlCallback = (error, res, done) => {
    if (error) {
        console.log(error);
    } else {
        const $ = res.$;
        res.options.title = replaceSpecialCharacters($('title').text());
        res.options.version = replaceSpecialCharacters($('meta[name="Generator"]').attr('content'));
        input.push(res.options);
    }
    done();
};

const crawl = new crawler({
    callback: crawlCallback,
});

crawl.on('drain', function () {
    input.sort((item) => item.id);
    createRecords(input);
});

const parser = parse(
    { columns: true },
    async (err, rows) => {
        var urls = rows.map(function (row) {
            return {
                'id': row.id,
                'company': row.company,
                'salesperson': row.salesperson,
                'region': row.region,
                'uri': row.url,
                'version': '',
                'title': '',
                'performance': '',
                'accessibility': '',
                'best-practices': '',
                'seo': ''
            };
        });
        crawl.queue(urls);
    }
);

fs.createReadStream(__dirname + '/input.csv').pipe(parser);