const puppeteer = require('puppeteer')

const parseArgs = require('minimist')

require('isomorphic-fetch')


const ERR_SELECTOR_NOT_FOUND = 'SELECTOR NOT FOUND'
const ERR_MISSING_FLAG = 'MISSING COMMAND LINE FLAG'
const ERR_MISSING_ENV = 'MISSING ENVIRONMENT VARIABLE'

/* async function children(element, page) {
 * 	let ret = []
 * 	const childrenHandle = await page.evaluateHandle(thisElement => thisElement.children, element)
 * 	const p = await childrenHandle.getProperties()
 * 	for (const l of p.values()) {
 * 		const child = l.asElement()
 * 		if (child) {
 * 			ret.push(child)
 * 		}
 * 	}
 * 	return ret
 * }*/

/* async function find(pred, page, rootElement, getChildren = children) {
 * 	let found = []
 * 	if (rootElement === undefined) {
 * 		rootElement = await page.evaluateHandle(() => document.body)
 * 	}
 * 	let stack = Array.from(await getChildren(rootElement, page))
 * 	for (let candidate = stack.pop(); stack.length > 0; candidate = stack.pop()) {
 * 		if (pred(candidate)) {
 * 			const childrenOfCandidate = await getChildren(candidate, page)
 * 			if (childrenOfCandidate.length === 0) {
 * 				found.push(candidate)
 * 				continue
 * 			}
 * 			stack = stack.concat(childrenOfCandidate)
 * 		}
 * 	}
 * 	return found.reverse()
 * }*/

function sleep(ms) {
	return new Promise(resolve => {
		setTimeout(resolve, ms)
	})
}

/* async function untilRepeatedlyTheSame(f, interval = 10000, maxTries = 10) {
 * 	var res = null, prevRes, tries = 0
 * 	do {
 * 		[ res, prevRes ] = [ await f(), res ]
 * 		await sleep(interval)
 * 	} while (++tries < maxTries || res !== prevRes)
 * 	return res === prevRes
 * }*/

/* const queryVisibleSelectorAllInBrowser = (selector, pred) =>
 * 	  Array.from(document.querySelectorAll(selector)).filter(x => x.offsetParent !== null && (pred === undefined || pred(x)))
 *
 * function truthifyArrayReturningFn(f) {
 * 	return function(...args) {
 * 		return f(...args).length > 0
 * 	}
 * }
 *
 * async function queryVisibleSelectorAll(selector, page, pred) {
 * 	const selectors = await page.evaluateHandle((selector, pred) =>
 * 												Array.from(document.querySelectorAll(selector))
 * 												.filter(x => x.offsetParent !== null &&
 * 														(pred === undefined || pred(x))),
 * 												selector, pred)
 * 	const selectorsAsObj = await selectors.getProperties()
 * 	let ret = []
 * 	for (const handle of selectorsAsObj.values()) {
 * 		const maybeElement = handle.asElement()
 * 		if (maybeElement) {
 * 			ret.push(maybeElement)
 * 		}
 * 	}
 * 	// await selectors.dispose() // just leak all over the place
 * 	return ret
 * }*/

(async () => {
	const args = parseArgs(process.argv.slice(2))

	try {
		const { NAMECHEAP_USERNAME, NAMECHEAP_PASSWORD } = process.env
		if (NAMECHEAP_USERNAME === undefined) {
			console.error(`Missing environment variable NAMECHEAP_USERNAME`)
			throw new Error(ERR_MISSING_ENV)
		}
		if (NAMECHEAP_PASSWORD === undefined) {
			console.error(`Missing environment variable NAMECHEAP_PASSWORD`)
			throw new Error(ERR_MISSING_ENV)
		}
		const required = ['domain', 'to', 'ddns-host', 'ddns-password']
		const missing = required.filter(flag => args[flag] === undefined)
		if (missing.length > 0) {
			console.error(`Missing values for required command line flag(s): ${JSON.stringify(missing)}`)
			console.dir(args)
			throw new Error(ERR_MISSING_FLAG)
		}

		const b = await puppeteer.launch({
			headless: true,
			args: [
				// Disabling sandbox needed for running as systemd service as root
				// https://github.com/GoogleChrome/puppeteer/blob/master/docs/troubleshooting.md
				'--no-sandbox',
				'--disable-setuid-sandbox'
			]
		})
		const page = await b.newPage()
		await page.setViewport({width: 1300, height: 700})
		await page.goto(`https://ap.www.namecheap.com/Domains/DomainControlPanel/${args['domain']}/advancedns`)
		await page.waitForSelector('.nc_username')
			.then(x => x.focus())
			.then(() => page.keyboard.type(NAMECHEAP_USERNAME))
			.then(() => page.keyboard.press('Tab'))
			.then(() => page.keyboard.type(NAMECHEAP_PASSWORD))
			.then(() => page.keyboard.press('Enter'))
		await page.waitForNavigation({waitUntil: 'networkidle0'})
		await page.waitForSelector('.advanced-dns')
		// console.log('found .advanced-dns')
		await page.waitForSelector('.remove')
		await sleep(5000) // not really necessary but nice
		await page.waitForFunction(
			host => Array.from(document.querySelectorAll('td.host > p'))
						 .find(x => x.offsetParent !== null && x.textContent.includes(host)),
			{polling: 100, timeout: 60000},
			args['ddns-host']
		)
		// Get currently set IP of that host
		const oldIPValueHandle = await page.evaluateHandle(
			host => Array.from(document.querySelectorAll('td.host > p'))
						 .find(x => x.offsetParent !== null && x.textContent.includes(host))
						 .parentNode
						 .parentNode
						 .querySelector('td.value > p')
						 .textContent,
			args['ddns-host']
		)
		const oldIPValue = await oldIPValueHandle.jsonValue()
		if ((oldIPValue + '').includes(args['to'])) {
			// Short circuit out if this is actually the IP
			// implying DNS lag time caused false positive in run.sh script
			await b.close()
			// console.log('has target IP already')
			process.exit(0)
		}
		// Now just change every reference to that IP
		// (In case there are duplicate DNS zones with the same IP. Why should you ever use an invalid IP? Just makes sense.)
		const oldIPButtonsArrayHandle = await page.evaluateHandle(
			prevIP => Promise.resolve(
				Array.from(document.querySelectorAll('p'))
					 .filter(x => x.offsetParent !== null && x.textContent.includes(prevIP))
			),
			oldIPValue
		)
		let oldIPButtons = []
		for (const oldIPButtonItem of (await oldIPButtonsArrayHandle.getProperties()).values()) {
			const oldIPButtonElement = await oldIPButtonItem.asElement()
			if (oldIPButtonElement) oldIPButtons.push(oldIPButtonElement)
		}
		// console.log(`oldIPButtons.length=${oldIPButtons.length}`)
		if (oldIPButtons.length === 0) throw new Error(ERR_SELECTOR_NOT_FOUND)
		for (const oldIPButton of oldIPButtons) {
			await oldIPButton.click()
			await sleep(1000)
			const inputFieldHandle = await page.evaluateHandle(() =>
				Promise.resolve(
					Array.from(document.querySelectorAll('input[name="idAddress"]'))
						 .find(x => x.offsetParent !== null)
				)
			)
			const inputField = await inputFieldHandle.asElement()
			const inputFieldValue = await (await inputField.getProperty('value')).jsonValue()
			for (let i = 0; i < inputFieldValue.length; i++) await inputField.press('Backspace')
			await inputField.type(args['to'])
			const saveButton = await page.$('.save')
			await saveButton.click()
			await sleep(5000)
		}


		await b.close()
	} catch (e) {
		// This will happen when namecheap changes their CSS selectors
		console.error(e)
		// Execute fallback via namecheap's ddns protocol
		// https://www.namecheap.com/support/knowledgebase/article.aspx/29/11/how-to-use-the-browser-to-dynamically-update-hosts-ip
		fetch(`https://dynamicdns.park-your-domain.com/update?host=${args['ddns-host']}&domain=${args['domain']}&password=${args['ddns-password']}&ip=${args['to']}`).catch(e => {
			console.error(e)
			console.error('Fallback failed!')
			process.exit(1)
		})
	}
	process.exit(0)
})()
