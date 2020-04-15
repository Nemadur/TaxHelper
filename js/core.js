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
    $('#listButton').on('click', getExchangeRate);
    $('#processButton').on('click', processFile);

    var CSVfile = [];
    
    function getExchangeRate(open, close, currency = 'usd') {
        
        return new Promise(resolve => {

            let openingDate = (open && typeof open == 'string') ? open : getValidDate($('#openingDate').val(), 'NBP');
            let closingDate = (close && typeof close == 'string') ? close : getValidDate($('#closingDate').val(), 'NBP');
            

            const URL = 'https://api.nbp.pl/api/exchangerates/rates/c/';
        
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
        renderTable(resultTable);
        $('#processButton').removeClass('disabled');
    }
    
    function renderTable(data) {
        
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
        var exchangeList = await getExchangeRate(dates[0], dates[1]);

        CSVfile[0].splice(3,0,'Kurs');

        for (const index in CSVfile) {
            if (index == 0) {
                continue;
            }
            const element = CSVfile[index];

            let date = getValidDate(element[0], 'NBP');

            let NBPLine = exchangeList.rates.find( e => e.effectiveDate == date);
            let NBPindex = exchangeList.rates.indexOf(NBPLine);
            let bidRate = 'n/a';

            if (--NBPindex > -1) {
                const exchangeLine = exchangeList.rates[NBPindex];
                bidRate = exchangeLine.bid;
            }

            element.splice(3,0,bidRate);
            element[2] = (NBPindex > -1) ? 'PLN' : element[2];
            element[4] = getPLNValue(element[4], bidRate);

        }


        renderTable(CSVfile);
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
        var newOpening = `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`;

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
    
}