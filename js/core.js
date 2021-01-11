$(document).ready(core_init);
window.semantic_init = core_init;

function core_init() {
    
    document.getElementsByName('datepicker').forEach(element => {
        const datepicker = new TheDatepicker.Datepicker(element);
        datepicker.options.setInputFormat('j.n.Y');
    
        datepicker.render();
    });
    
    $('#fileButton').on('click', fileClick);
    $('#fileInput').on('change', readSingleFile);

    $('#listButton').on('click', getDatesRates);
    $('#processButton').on('click', processFile);

    var CSVfile = [];

    // Source: http://stackoverflow.com/questions/497790
    var dates = {
        convert:function(d) {
            // Converts the date in d to a date-object. The input can be:
            //   a date object: returned without modification
            //  an array      : Interpreted as [year,month,day]. NOTE: month is 0-11.
            //   a number     : Interpreted as number of milliseconds
            //                  since 1 Jan 1970 (a timestamp) 
            //   a string     : Any format supported by the javascript engine, like
            //                  "YYYY/MM/DD", "MM/DD/YYYY", "Jan 31 2009" etc.
            //  an object     : Interpreted as an object with year, month and date
            //                  attributes.  **NOTE** month is 0-11.
            return (
                d.constructor === Date ? d :
                d.constructor === Array ? new Date(d[0],d[1],d[2]) :
                d.constructor === Number ? new Date(d) :
                d.constructor === String ? new Date(d) :
                typeof d === "object" ? new Date(d.year,d.month,d.date) :
                NaN
            );
        },
        compare:function(a,b) {
            // Compare two dates (could be of any type supported by the convert
            // function above) and returns:
            //  -1 : if a < b
            //   0 : if a = b
            //   1 : if a > b
            // NaN : if a or b is an illegal date
            // NOTE: The code inside isFinite does an assignment (=).
            return (
                isFinite(a=this.convert(a).valueOf()) &&
                isFinite(b=this.convert(b).valueOf()) ?
                (a>b)-(a<b) :
                NaN
            );
        },
        inRange:function(d,start,end) {
            // Checks if date in d is between dates in start and end.
            // Returns a boolean or NaN:
            //    true  : if d is between start and end (inclusive)
            //    false : if d is before start or after end
            //    NaN   : if one or more of the dates is illegal.
            // NOTE: The code inside isFinite does an assignment (=).
        return (
                isFinite(d=this.convert(d).valueOf()) &&
                isFinite(start=this.convert(start).valueOf()) &&
                isFinite(end=this.convert(end).valueOf()) ?
                start <= d && d <= end :
                NaN
            );
        }
    }

    // DATES

    async function getDatesRates() {
        let openingDate = getValidDate($('#openingDate').val(), 'NBP');
        let closingDate = getValidDate($('#closingDate').val(), 'NBP');
        let currency = $('#currency').val();

        if (!datesValidation(openingDate, closingDate)) {
            
        }

        var exchangeList = await getExchangeRate(openingDate, closingDate, currency);

        $('#tableTitle').html(`Tabela: ${exchangeList.table} - ${exchangeList.currency} [${exchangeList.code}]`);
        
        let table = prepareExchangeTable(exchangeList.rates);
        renderTable(table);
        $('#exchangeTable').removeClass('nodisplay');
    }

    function datesValidation(open, close) {

        if (!open || !close) {
            return false
        }

        let opening = open.split('-');
        let openingDate = new Date(opening[0], opening[1], opening[2]);

        let closing = close.split('-');
        let closingDate = new Date(closing[0], closing[1], closing[2]);

        if (dates.compare(openingDate, closingDate) < 1){
            return true
        };

        return false
    }

    function prepareExchangeTable(params) {
        
        let header = Object.keys(params[0]);
        let data = [];

        for (const key in params) {
            data.push(Object.values(params[key]))
        }

        return {header: header, data: data}
    }

    // CSV FILE
    
    function fileClick(e) {
        document.getElementById('fileInput').click();
    }

    function readSingleFile(e) {
        var file = e.target.files[0];
        if (!file) {
            return;
        }
        var reader = new FileReader();
        var name = file.name;

        reader.onload = function(e) {
            var contents = e.target.result;
            $('#fileName').html(name);

            displayContents(contents);
            $('#exchangeTable').removeClass('nodisplay');
        };
        reader.readAsText(file);
    }
    
    function displayContents(contents) {
    
        var csvArray = contents.split('\n');
        let resultTable = [];

        var header = true;
        csvArray.forEach(element => {
            if (element[0] == '"') {
                element = element.substr(1);
            }
            let lineData = element.split('","');
            let date = getValidDate(lineData[0], 'show');
            let name = lineData[3];
            let currency = lineData[6];
            let value = lineData[9];
            let transactionId = lineData[12];

            if (validLine([date, name, currency, value, transactionId]) || header) {
                resultTable.push( [date, name, currency, value, transactionId] )
                header = false;
            }
        });

        CSVfile = resultTable;
        renderTableOld(resultTable);
        $('#processButton').removeClass('disabled');
    }

    function validLine(line) {

        if (!line[0] || !line[1] || !line[2] || !line[3] || !line[4]) {
            return false
        }
        if (line[2] !== 'USD') {
            return false
        }
        if (line[3] < 0) {
            return false
        }
        return true
    }


    // PROCESS FILE

    async function processFile() {
        
        let dates = getDates(CSVfile);
        var exchangeList = await getExchangeRate(dates[0], dates[1], 'usd');

        CSVfile[0].splice(3,0,'Kurs');

        for (const index in CSVfile) {
            if (index == 0) {
                continue;
            }
            const element = CSVfile[index];

            let date = getValidDate(element[0], 'NBP');

            let rates =  getRates(date, exchangeList);

            // let NBPindex = exchangeList.rates.indexOf(NBPLine);
            // let bidRate = 'n/a';

            // if (--NBPindex > -1) {
            //     const exchangeLine = exchangeList.rates[NBPindex];
            //     bidRate = exchangeLine.bid;
            // }

            // element.splice(3,0,bidRate);
            // element[2] = (NBPindex > -1) ? 'PLN' : element[2];
            // element[4] = getPLNValue(element[4], bidRate);
            element.splice(3,0,rates[0]);
            element[2] = (rates[1] > -1) ? 'PLN' : element[2];
            element[4] = getPLNValue(element[4], rates[0]);

        }

        renderTableOld(CSVfile);
    }

    function getRates(date, exchangeList) {
        let NBPLine = exchangeList.rates.find( e => e.effectiveDate == date);
        let getPrevious = true

        if (NBPLine == -1 || !NBPLine) getPrevious = false;
        
        while (NBPLine == -1 || !NBPLine) {
            date = getPreviousDate(date);
            NBPLine = exchangeList.rates.find( e => e.effectiveDate == date);
        }

        let NBPindex = getPrevious ? exchangeList.rates.indexOf(NBPLine) -1: exchangeList.rates.indexOf(NBPLine);

        const exchangeLine = exchangeList.rates[NBPindex];
        let bidRate = exchangeLine.bid;

        return [bidRate, NBPindex];
    }

    function getPreviousDate(date) {
        const yesterday = new Date(date);

        yesterday.setDate(yesterday.getDate()-1);

        let newYear = yesterday.getFullYear();
        let newMonth = yesterday.getMonth()+1;
        let newDay = yesterday.getDate();

        return getValidDate(`${newDay}.${newMonth}.${newYear}`, 'NBP');
    }

    function getPLNValue(value, bidRate) {
        if (+bidRate > 0) {
            value = value.replace(',', '.');
            return +value * bidRate
        }
        return 'n/a'
    }

    function getDates(file) {
        
        var rawOpening = file[1][0].split('.');
        var rawClosing = file[file.length -1][0].split('.');

        var openig = getValidDate(`${rawOpening[0]}.${rawOpening[1]}.${rawOpening[2]}`, 'NBP');
        var closing = getValidDate(`${rawClosing[0]}.${rawClosing[1]}.${rawClosing[2]}`, 'NBP');

        openig = openig.split('-');
        var date = new Date(openig[0], openig[1] -1, openig[2] -7);

        let newYear = date.getFullYear();
        let newMonth = date.getMonth()+1;
        let newDay = date.getDate();

        let newOpening = getValidDate(`${newDay}.${newMonth}.${newYear}`, 'NBP');

        // var newOpening = `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`;

        return [newOpening, closing]
    }


    // MESSAGES
    function showMessage(msg, type) {
        
    }
    

    function getValidDate(date, type) {
    
        var patt = /\d+/g;
        var result = date.match(patt);
    
        if (result && result.length === 3) {
            let day = (result[0].length < 2)? `0${result[0]}` : result[0];
            let month = (result[1].length < 2)? `0${result[1]}` : result[1];
            let year = result[2];
        
            switch (type) {
                case 'NBP':
                    return `${year}-${month}-${day}`;
                default:
                    return `${day}. ${month}. ${year}`;
            }
    
        } else {
            return date;
        }
    }
    
    function getExchangeRate(openingDate, closingDate, currency) {
        
        return new Promise(resolve => {

            const URL = 'https://api.nbp.pl/api/exchangerates/rates/c';
        
            if (openingDate && closingDate) {
                let exchangeUrl = `${URL}/${currency}/${openingDate}/${closingDate}/`;
        
                var xhttp = new XMLHttpRequest();
        
                xhttp.onreadystatechange = function() {
            
                    if (this.readyState == 4 && this.status == 200) {
                        let data = JSON.parse(this.responseText);
                        resolve(data);
                    }
                };
            
                xhttp.open("GET", exchangeUrl, true);
                xhttp.send();
            }
        });
    }

    function renderTableOld(data) {
        
        const tableHead = $('#exchangeTableHead');
        const tableBody = $('#exchangeTableBody');

        tableHead.empty();
        tableBody.empty();

        var tableHeadRow = document.createElement('tr');
        data[0].forEach(element => {
            var headCell = document.createElement('th');
            headCell.innerHTML = element;

            tableHeadRow.appendChild(headCell);
        });
        
        tableHead.append(tableHeadRow);

        for (let key in data) {
            if (key == 0) {
                continue;
            }

            const element = data[key];
            
            var bodyRow = document.createElement('tr');
            element.forEach( cell => {
                var bodyCell = document.createElement('td');
                bodyCell.innerHTML = cell;

                bodyRow.appendChild(bodyCell);
            });

            tableBody.append(bodyRow);
        }
    }

    function renderTable(table) {
        
        const tableHead = $('#exchangeTableHead');
        const tableBody = $('#exchangeTableBody');

        tableHead.empty();
        tableBody.empty();

        var tableHeadRow = document.createElement('tr');
        table.header.forEach(element => {
            var headCell = document.createElement('th');
            headCell.innerHTML = element;

            tableHeadRow.appendChild(headCell);
        });
        tableHead.append(tableHeadRow);

        table.data.forEach(element => {
            var bodyRow = document.createElement('tr');
            element.forEach( cell => {
                var bodyCell = document.createElement('td');
                bodyCell.innerHTML = cell;

                bodyRow.appendChild(bodyCell);
            });

            tableBody.append(bodyRow);
        });
    }
}