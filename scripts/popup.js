const yearsInFuture = 6;
const defaultDiscount = 13;
var revenueEstimates = [];
var revenueGrowthEstimates = [];
var fcfsEstimates = [];
var fcfsGrowthEstimates = [];
var fcfsMarginEstimates = [];
var shares = 0;
var netDebt = 0;
var futureFcfMultiple = 0;
var discount = 0;

function formatSmallNumber(number) {
    const flooredNumber = Math.floor(Math.round(number * 100)) / 100;
    return flooredNumber.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
}
function formatBigNumber(number) {
    const flooredNumber = Math.floor(number);
    return flooredNumber.toLocaleString('en-US', {
        maximumFractionDigits: 0
      });
}

function createTable(years, values, growthValues, table, marginValues) {
    table.innerHTML = '';
    const thead = table.createTHead();
    const headerRow = thead.insertRow();
    years = years.filter(x => !x.includes('(E)'));
    for (const year of years) {
        const th = document.createElement('th');
        th.textContent = year;
        headerRow.appendChild(th);
    }

    const tbody = table.createTBody();
    const dataRow = tbody.insertRow();
    values = values.slice(0, years.length);
    for (const entryValue of values) {
        const td = document.createElement('td');
        td.textContent = formatBigNumber(entryValue);
        dataRow.appendChild(td);
    }

    const gorwthRow = tbody.insertRow();
    const growthTd = document.createElement('td');
    growthTd.textContent = 'Growth';
    gorwthRow.appendChild(growthTd);
    for (let i = 1; i < values.length; i++) {
        const td = document.createElement('td');
        td.textContent = formatSmallNumber(growthValues[i]) + '%';
        gorwthRow.appendChild(td);
    }

    if (!marginValues)
        return;
    
    const marginRow = tbody.insertRow();
    for (let i = 0; i < values.length; i++) {
        const td = document.createElement('td');
        td.textContent = formatSmallNumber(marginValues[i]) + '%';
        marginRow.appendChild(td);
    }
}

function calculateGrowthValues(years, values) {
    const data = [];
    for (let i = 1; i < values.length; i++) {
        let pastValue = years[i - 1] == 'LTM' ? values[i-2] : values[i-1];
        data[i] = ((values[i] / pastValue) - 1) * 100;
    }
    return data;
}

function calculateMarginValues(years, values, revenueYears, revenueValues) {
    const data = [];
    for (let i = 0; i < values.length; i++) {
        const revenueIndex = revenueYears.findIndex(x => x == years[i])
        const revenue = revenueValues[revenueIndex];
        data[i] = (values[i] / revenue) * 100;
    }
    return data;
}

function createRevenueTable() {
    if (!tickerData.incomeStatement)
        return;
    const years = tickerData.incomeStatement.years;
    const values = tickerData.incomeStatement.totalRevenues;
    revenueGrowthValues = calculateGrowthValues(years, values);
    const table = document.getElementById("revenueTable");
    createTable(years, values, revenueGrowthValues, table);
    let afterLastValueIndex = tickerData.incomeStatement.years.findIndex(x => x == 'LTM')
    if (afterLastValueIndex == -1)
        afterLastValueIndex = tickerData.incomeStatement.years.findIndex(x => x.includes('(E)'))
    if (afterLastValueIndex == -1)
        afterLastValueIndex = tickerData.incomeStatement.years.length;
    lastRevenueValue = tickerData.incomeStatement.totalRevenues[afterLastValueIndex - 1];
}

function createFcfTable() {
    if (!tickerData.cashFlowStatement)
        return;
    const years = tickerData.cashFlowStatement.years;
    const values = tickerData.cashFlowStatement.freeCashFlows;
    fcfGrowthValues = calculateGrowthValues(years, values);
    fcfMarginValues = calculateMarginValues(years, values, tickerData.incomeStatement.years, tickerData.incomeStatement.totalRevenues);
    const table = document.getElementById("fcfTable");
    createTable(years, values, fcfGrowthValues, table, fcfMarginValues);  
    let afterLastValueIndex = tickerData.cashFlowStatement.years.findIndex(x => x == 'LTM')
    if (afterLastValueIndex == -1)
        afterLastValueIndex = tickerData.cashFlowStatement.years.findIndex(x => x.includes('(E)'))
    if (afterLastValueIndex == -1)
        afterLastValueIndex = tickerData.cashFlowStatement.years.length;
    lastFcfValue = tickerData.cashFlowStatement.freeCashFlows[afterLastValueIndex - 1];
}

function createEstimatesTable() {
    if (!tickerData.incomeStatement || !tickerData.cashFlowStatement)
        return;
    const table = document.getElementById("estTable");
    table.innerHTML = '';
    const revenueYears = tickerData.incomeStatement.years
        .map((str, index) => str.includes("(E)") ? { year: str, index: index } : null)
        .filter(x => !!x);
    revenueGrowthEstimates = tickerData.estimates?.revenueGrowth || revenueYears.map(x => revenueGrowthValues[x.index]);
    fcfsMarginEstimates = tickerData.estimates?.fcfsMargin || revenueYears.map(x => fcfMarginValues[x.index]);

    const thead = table.createTHead();
    const headerRow = thead.insertRow();
    const yearsTh = document.createElement('th');
    headerRow.appendChild(yearsTh);
    for (let i = 0; i < yearsInFuture; i++) {
        const th = document.createElement('th');
        if (i < revenueYears.length)
            th.textContent = revenueYears[i].year;
        headerRow.appendChild(th);
    }

    const tbody = table.createTBody();
    const revenuesRow = tbody.insertRow();
    const revenueTd = document.createElement('td');
    revenueTd.textContent = 'Revenue';
    revenuesRow.appendChild(revenueTd);
    for (let i = 0; i < yearsInFuture; i++) {
        const td = document.createElement('td');
        revenuesRow.appendChild(td);
    }

    const revenuesGrowthRow = tbody.insertRow();
    const revenueGrowthTd = document.createElement('td');
    revenueGrowthTd.textContent = 'Growth';
    revenuesGrowthRow.appendChild(revenueGrowthTd);
    for (let i = 0; i < yearsInFuture; i++) {
        const td = document.createElement('td');
        const input = document.createElement('input');
        if (i < revenueGrowthEstimates.length || i < revenueYears.length){
            input.value = formatSmallNumber((revenueGrowthEstimates[i] == null || isNaN(revenueGrowthEstimates[i])) && i < revenueYears.length ? revenueGrowthValues[revenueYears[i].index] : revenueGrowthEstimates[i]);
        }
        input.addEventListener('input', updateCalculation);
        td.appendChild(input);
        revenuesGrowthRow.appendChild(td);
    }
    
    const fcfsRow = tbody.insertRow();
    const fcfsTd = document.createElement('td');
    fcfsTd.textContent = 'FCF';
    fcfsRow.appendChild(fcfsTd);
    for (let i = 0; i < yearsInFuture; i++) {
        const td = document.createElement('td');
        fcfsRow.appendChild(td);
    }

    const fcfsGrowthRow = tbody.insertRow();
    const fcfsGrowthTd = document.createElement('td');
    fcfsGrowthTd.textContent = 'Growth';
    fcfsGrowthRow.appendChild(fcfsGrowthTd);
    for (let i = 0; i < yearsInFuture; i++) {
        const td = document.createElement('td');
        fcfsGrowthRow.appendChild(td);
    }

    const fcfsMarginRow = tbody.insertRow();
    const fcfsMarginTd = document.createElement('td');
    fcfsMarginTd.textContent = 'Margin';
    fcfsMarginRow.appendChild(fcfsMarginTd);
    for (let i = 0; i < yearsInFuture; i++) {
        const td = document.createElement('td');
        const input = document.createElement('input');
        if (i < fcfsMarginEstimates.length || i < revenueYears.length)
            input.value = formatSmallNumber((fcfsMarginEstimates[i] == null || isNaN(fcfsMarginEstimates[i])) && i < revenueYears.length ? fcfMarginValues[revenueYears[i].index] : fcfsMarginEstimates[i]);
        input.addEventListener('input', updateCalculation);
        td.appendChild(input);
        fcfsMarginRow.appendChild(td);
    }
}

function initializeOtherInfo() {
    const sharesSpan = document.getElementById("shares");
    shares = tickerData.shares;
    sharesSpan.textContent = shares;

    const netDebtInput = document.getElementById("netDebt");
    netDebt = tickerData.estimates?.netDebt ?? tickerData.netDebt;
    netDebtInput.value = netDebt;

    const futureFcfMultipleInput = document.getElementById("futureFcfMultiple");
    futureFcfMultiple = tickerData.estimates?.futureFcfMultiple ?? tickerData.pFcf;
    futureFcfMultipleInput.value = futureFcfMultiple;


    const discountInput = document.getElementById("discount");
    discount = tickerData.estimates?.discount ?? defaultDiscount;
    discountInput.value = discount ?? '';
}

function updateRevenueEstimates(table) {
    if (!tickerData.incomeStatement || !tickerData.cashFlowStatement)
        return;
    const growthEstimatesRow = table.rows[2];
    const growthEstimatesInputs = growthEstimatesRow.querySelectorAll('input');
    revenueGrowthEstimates = Array.from(growthEstimatesInputs, x => parseFloat(x.value) ?? 0);

    const estimatesRow = table.rows[1];
    const estimatesTds = estimatesRow.querySelectorAll('td');

    let lastValue = lastRevenueValue;
    for (let i = 0; i < revenueGrowthEstimates.length; i++){
        let newValue = lastValue * (revenueGrowthEstimates[i] / 100 + 1);
        lastValue = newValue;
        revenueEstimates[i] = newValue;
        estimatesTds[i + 1].textContent = formatBigNumber(newValue);
    }
}

function updateFcfEstimates(table) {
    if (!tickerData.incomeStatement || !tickerData.cashFlowStatement)
        return;
    const marginEstimatesRow = table.rows[5];
    const marginEstimatesInputs = marginEstimatesRow.querySelectorAll('input');
    fcfsMarginEstimates = Array.from(marginEstimatesInputs, x => parseFloat(x.value) ?? 0);

    const estimatesRow = table.rows[3];
    const estimatesTds = estimatesRow.querySelectorAll('td');
    
    for (let i = 0; i < fcfsMarginEstimates.length; i++){
        let newValue = revenueEstimates[i] * (fcfsMarginEstimates[i] / 100);
        fcfsEstimates[i] = newValue;
        estimatesTds[i + 1].textContent = formatBigNumber(newValue);
    }

    const growthEstimatesRow = table.rows[4];
    const growthEstimatesTds = growthEstimatesRow.querySelectorAll('td');

    let lastValue = lastFcfValue;
    for (let i = 0; i < fcfsEstimates.length; i++){
        let growth = ((fcfsEstimates[i] / lastValue - 1) * 100) ?? 0;
        fcfsGrowthEstimates[i] = growth;
        lastValue = fcfsEstimates[i];
        growthEstimatesTds[i + 1].textContent = formatSmallNumber(growth) + '%';
    }
}

function updateOtherInfo() {
    const parsedNetDebt = parseFloat(document.getElementById('netDebt').value);
    netDebt = isNaN(parsedNetDebt) ? null : parsedNetDebt;

    const parsedFutureFcfMultiple = parseFloat(document.getElementById('futureFcfMultiple').value);
    futureFcfMultiple = isNaN(parsedFutureFcfMultiple) ? null : parsedFutureFcfMultiple;

    discount = parseFloat(document.getElementById('discount').value) || 0;
}

function updateFinalValue() {
    if (!discount || !shares)
        return;
    const actualDiscount = discount / 100 + 1;
    const discountedFcfs = fcfsEstimates.map((x, i) => x / Math.pow(actualDiscount, i + 1));
    const discountedFcfsSum = discountedFcfs.reduce((partialSum, a) => partialSum + a, 0);
    const discountedTerminalValue = futureFcfMultiple * fcfsEstimates[fcfsEstimates.length - 1] / Math.pow(actualDiscount, yearsInFuture + 1);
    const companyValue = discountedFcfsSum + discountedTerminalValue - netDebt;
    const shareValue = companyValue / shares;
    document.getElementById('finalValue').textContent = formatSmallNumber(shareValue);
}

async function updateCalculation() {
    const table = document.getElementById("estTable");
    updateRevenueEstimates(table);
    updateFcfEstimates(table);
    updateOtherInfo();
    updateFinalValue();
    tickerData.estimates = {
        revenueGrowth: revenueGrowthEstimates,
        fcfsMargin: fcfsMarginEstimates,
        netDebt: netDebt,
        futureFcfMultiple: futureFcfMultiple,
        discount: discount
    };

    await chrome.storage.local.set({ [ticker]: tickerData });
}

async function loadData() {
    ticker = (await chrome.storage.local.get("ticker"))?.ticker || {};
    tickerData = (await chrome.storage.local.get(ticker))?.[ticker] || {};
}

async function refreshData() {
    if (tickerData.estimates) {
        tickerData.estimates.revenueGrowth[0] = null;
        tickerData.estimates.revenueGrowth[1] = null;
        tickerData.estimates.revenueGrowth[2] = null;
        tickerData.estimates.fcfsMargin[0] = null;
        tickerData.estimates.fcfsMargin[1] = null;
        tickerData.estimates.fcfsMargin[2] = null;
        tickerData.estimates.netDebt = null;
        tickerData.estimates.futureFcfMultiple = null;
    }
    loadData();
}

async function reloadVisual() {
    const tickerHeaderElement = document.getElementById("tickerHeader");
    tickerHeaderElement.textContent = ticker;
    
    createRevenueTable();
    createFcfTable();
    createEstimatesTable();
    initializeOtherInfo();
    await updateCalculation();
}

async function load() {
    await loadData();
    await reloadVisual();
}

async function refreshEmpty() {
    await reloadVisual()
}

async function refresh() {
    await refreshData();
    await reloadVisual();
}

document.addEventListener("DOMContentLoaded", load);
document.getElementById('refreshEmptyButton').addEventListener('click', refreshEmpty);
document.getElementById('refreshButton').addEventListener('click', refresh);
document.getElementById('netDebt').addEventListener('input', updateCalculation);
document.getElementById('futureFcfMultiple').addEventListener('input', updateCalculation);
document.getElementById('discount').addEventListener('input', updateCalculation);