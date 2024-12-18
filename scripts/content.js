let lastUrl = '';
let successful = false;
let missingRevenuesEstimates = false;
let missingFcfEstimates = false;

function extractData(rowRoot) {
    let data = [];
    let sibling = rowRoot.nextSibling;
    while (sibling) {
        data.push(sibling.firstChild.firstChild.textContent);
        sibling = sibling.nextSibling;
    }
    return data;
}

function extractFloatData(rowRoot) {
    return extractData(rowRoot).map((x) => {
        if (x == '-' || x == '—')
            return 0;
        return parseFloat(x.replace(/[$,CN¥€₩]/g, ''), 10)
    });
}

function updateIncomeStatement(data) {
    const totalRevenuesSpan = Array.from(document.getElementsByTagName('span'))
        .find(element => element.textContent.trim() === "Total Revenues");
    if (!totalRevenuesSpan)
        return false;
    const yearsRowRoot = totalRevenuesSpan.closest('table').querySelector('thead').querySelector('tr').querySelector('th');
    const years = extractData(yearsRowRoot);
    missingRevenuesEstimates = years.filter(x => x.includes('(E)')).length < 3
    const alreadyMissing = data.incomeStatement?.years?.filter(x => x.includes('(E)'))?.length < 3;
    if (missingRevenuesEstimates && !alreadyMissing)
        return true;
    const trRowRoot = totalRevenuesSpan.closest('td');
    const totalRevenues = extractFloatData(trRowRoot);
    let ok = true;
    if (totalRevenues.some(isNaN))
        ok = false;
    data.incomeStatement = {
        years: years,
        totalRevenues: totalRevenues
    }
    return ok;
}

function updateCashFlowStatement(data) {
    const freeCashFlowSpan = Array.from(document.getElementsByTagName('span'))
        .find(element => element.textContent.trim() === "Free Cash Flow");
    if (!freeCashFlowSpan)
        return false;
    const yearsRowRoot = freeCashFlowSpan.closest('table').querySelector('thead').querySelector('tr').querySelector('th');
    const years = extractData(yearsRowRoot);
    missingFcfEstimates = years.filter(x => x.includes('(E)')).length < 3
    const alreadyMissing = data.cashFlowStatement?.years?.filter(x => x.includes('(E)'))?.length < 3;
    if (missingFcfEstimates && !alreadyMissing)
        return true;
    const fcfRowRoot = freeCashFlowSpan.closest('td');
    const freeCashFlows = extractFloatData(fcfRowRoot);
    let ok = true;
    if (freeCashFlows.some(isNaN))
        ok = false;
    data.cashFlowStatement = {
        years: years,
        freeCashFlows: freeCashFlows
    }
    return ok;
}

function extractField(labelText) {
    const ps = Array.from(document.getElementsByTagName('p'))
        .filter(element => element.textContent.trim() === labelText);
    if (!ps)
        return null;
    for (const p of ps) {
        const newValueText = p.nextSibling.textContent.replace(/[$,CN¥€₩]/g, '');
        const multiple = newValueText.includes('B') ? 1000 : 1;
        const newValue = parseFloat(newValueText);
        if (isNaN(newValue))
            continue;
        return newValue * multiple;
    }
    return null
}

function updateOverview(data) {
    let ok = true;
    data.netDebt = extractField('Net Debt');
    if (data.netDebt == null)
        ok = false;
    data.shares = extractField('Shares Out');
    if (data.shares == null)
        ok = false;
    data.pFcf = extractField('P/FCF');
    if (data.pFcf == null)
        ok = false;
    return ok;
}

function updateFinancials(data, statement){
    if(statement == "income-statement")
        return updateIncomeStatement(data);
    else if (statement == "cash-flow-statement")
        return updateCashFlowStatement(data);
}

function updateData(data, section, statement) {
    if (section == "financials")
        return updateFinancials(data, statement);
    else if (!section && !statement)
        return updateOverview(data);
}

async function checkAndSaveTickerData() {
    const regex = /\/company\/([^\/]+)(?:\/([^\/]+))?(?:\/([^\/]+))?/;
    const matches = lastUrl.match(regex);
  
    if (!matches)
      return;
    const [ , ticker, section, statement ] = matches;
        
    chrome.storage.local.set({ ticker });

    const data = (await chrome.storage.local.get(ticker))?.[ticker] || {};
    const ok = updateData(data, section, statement);
    await chrome.storage.local.set({ [ticker]: data });
    return ok;
  }
  
async function setupObserver() {
    new MutationObserver(async () => {
      const currentUrl = window.location.href;
      if (currentUrl !== lastUrl || !successful || missingRevenuesEstimates || missingFcfEstimates) {
        successful = false;
        lastUrl = currentUrl;
        successful = await checkAndSaveTickerData();;
      }
    }).observe(document, { subtree: true, childList: true });
    
    checkAndSaveTickerData();
}

setupObserver();
