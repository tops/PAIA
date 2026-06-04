import puppeteer from 'puppeteer';

(async () => {
  console.log("Launching browser...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  // Set viewport to a typical desktop size
  await page.setViewport({ width: 1280, height: 1000 });

  console.log("Navigating to app...");
  await page.goto('http://localhost:5175/', { waitUntil: 'networkidle2' });

  // Clear localStorage to ensure we start clean
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.reload({ waitUntil: 'networkidle2' });

  console.log("Navigating to AI-kompassen...");
  // Click the AI-kompassen tab button
  const tabs = await page.$$('.nav-item');
  let compassTab = null;
  for (const tab of tabs) {
    const text = await page.evaluate(el => el.textContent, tab);
    if (text.includes('AI-kompassen')) {
      compassTab = tab;
      break;
    }
  }

  if (compassTab) {
    await compassTab.click();
  } else {
    console.error("Could not find AI-kompassen tab");
    await browser.close();
    return;
  }

  await new Promise(r => setTimeout(r, 1000));

  // Check if Starta testet button is present
  const startButton = await page.$('.btn-primary');
  if (startButton) {
    console.log("Clicking Starta testet...");
    await startButton.click();
    await new Promise(r => setTimeout(r, 500));
  }

  // Answer the questions (6 questions)
  for (let i = 0; i < 6; i++) {
    console.log(`Answering question ${i + 1}...`);
    // Wait for the option buttons to appear
    await page.waitForSelector('.compass-option-btn');
    const options = await page.$$('.compass-option-btn');
    if (options.length > 0) {
      // Click the first option
      await options[0].click();
      await new Promise(r => setTimeout(r, 500));
    } else {
      console.error(`Could not find options for question ${i + 1}`);
      break;
    }
  }

  console.log("Waiting for results page to load...");
  await new Promise(r => setTimeout(r, 1000));

  // Take screenshot of results
  const screenshotPath = '/Users/tops/.gemini/antigravity/brain/e367feb6-a925-4159-95c1-020d5b53bc91/compass_results.png';
  console.log(`Saving screenshot to ${screenshotPath}...`);
  await page.screenshot({ path: screenshotPath, fullPage: true });

  await browser.close();
  console.log("Done!");
})().catch(err => {
  console.error("Error running puppeteer:", err);
});
