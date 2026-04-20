import puppeteer from 'puppeteer';
import fs from 'fs';

const urls = [
    { name: 'home', url: 'https://labour-connect-india--sananmogre.replit.app/' },
    { name: 'dashboard', url: 'https://labour-connect-india--sananmogre.replit.app/dashboard' },
    { name: 'login', url: 'https://labour-connect-india--sananmogre.replit.app/login' }
];

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    for (const item of urls) {
        try {
            await page.goto(item.url, { waitUntil: 'networkidle0' });
            await new Promise(r => setTimeout(r, 2000));
            const html = await page.evaluate(() => document.querySelector('#root').innerHTML);
            fs.writeFileSync(`C:/Users/MOHAMMED SANAN/Desktop/labour-connect/labour-connect/${item.name}.html`, html || '');
            console.log(`Saved ${item.name}.html`);
        } catch (e) {
            console.error(`Error saving ${item.name}:`, e);
        }
    }

    await browser.close();
})();
