const TelegramBot = require('node-telegram-bot-api');
const config = require('./config.json');
const token = config.token;
const etherscan_token = config.etherscan_token;
const https = require('https');
const Etherscan = require('node-etherscan-api');
const blockexplorer = require('blockchain.info/blockexplorer');


const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, 'Введите кошелёк, который хотите отслеживать');
});

var btcwallet = 0; //variable for entered wallet
bot.onText(/^[^0x]\w{33,34}/, (msg) => { // reg-exp for BTC Wallets
    btcwallet = msg.text;
    bot.sendMessage(msg.chat.id, 'Ƀ Выберите опцию:', {
        reply_markup: {
            keyboard: [
                ['Баланс кошелька (BTC)'],
                ['Отслеживать новые транзакции (BTC)']
            ]
        }
    });
});

bot.on('message', (msg) => {
    if (msg.text.indexOf('(BTC)') === 16) { //hardcode to indicate that first option was chosen
        https.get('https://blockchain.info/balance?active=' + btcwallet,
            (res) => {
                let body = '';
                res.on('data', data => {
                    body += data;
                });
                let balance = 0;
                res.on('end', () => {
                    let json = JSON.parse(body);
                    // console.log(json);
                    balance = (json[btcwallet].final_balance * 0.00000001);
                    bot.sendMessage(msg.chat.id, "Баланс кошелька = " + balance + " BTC");
                });

            }).on('error', (e) => {
            console.error(e);
        });
    } else if (msg.text.indexOf('(BTC)') === 29) { //hardcode to indicate that second option was chosen
        let newWallet = new BTCWallet(btcwallet, msg);
        newWallet.message();
        newWallet.compareBTCtx();
    } else {
        return;
    }
});

let erc20wallet = 0; //variable for entered wallet
bot.onText(/0x\w{39,40}/, (msg) => { // reg-exp for ERC20 Wallets
    erc20wallet = msg.text;

    bot.sendMessage(msg.chat.id, '⟠ Выберите опцию:', {
        reply_markup: {
            keyboard: [
                ['Баланс кошелька (ETH)'],
                ['Отслеживать новые транзакции (ETH)']
            ]
        }
    });
});

bot.on('message', (msg) => {
    if (msg.text.indexOf('(ETH)') === 16) { //hardcode to indicate that first option was chosen
        https.get('https://api.etherscan.io/api?module=account&action=balance&address=' + erc20wallet + '&tag=latest&apikey=' + etherscan_token,
            (res) => {
                let body = '';
                res.on('data', data => {
                    body += data;
                });
                let balance = 0;
                res.on('end', () => {
                    let json = JSON.parse(body);
                    balance = (json.result * 0.000000000000000001);
                    bot.sendMessage(msg.chat.id, "Баланс кошелька = " + balance + " ETH");
                });

            }).on('error', (e) => {
            console.error(e);
        });
    } else if (msg.text.indexOf('(ETH)') === 29) { //hardcode to indicate that second option was chosen
        let newWallet = new ERC20Wallet(erc20wallet, msg);
        newWallet.message();
        newWallet.compareETHtx();
    } else {
        return;
    }
});

function ERC20Wallet(erc20wallet, msg) {
    this.erc20wallet = erc20wallet;
    // console.log(this.erc20wallet);
    this.message = function() {
        bot.sendMessage(msg.chat.id, "Я оповещу вас, как только на кошельке " + this.erc20wallet + " произойдёт новая транзакция!");
    };
    this.txNumber = function() { //method to get number of transactions on wallet
        let recentTxNumber = 0;
        return new Promise((resolve, reject) => {
            https.get('https://api.etherscan.io/api?module=account&action=txlist&address=' + this.erc20wallet + '&startblock=0&endblock=99999999&sort=asc&apikey=' + etherscan_token,
                (res) => {
                    let body = '';
                    res.on('data', data => {
                        body += data;
                    });
                    res.on('end', () => {
                        try {
                            let json = JSON.parse(body);
                            recentTxNumber = json.result.length;
                            // console.log(json.result.length);
                            resolve(recentTxNumber);
                        } catch (e) {
                            reject(e.message);
                        }
                    });
                }).on('error', (e) => {
                console.error(e);
            });
        });
    };
    this.compareETHtx = function() { //method which compares the number of transactions on wallet every 'n' seconds, that mentioned on setInterval function
        let scope = this;
        this.txNumber(this.erc20wallet).then(response => {
                let txs = response;
                console.log(txs);
                setInterval(function() {
                    scope.txNumber(this.erc20wallet)
                        .then(response => {
                            let recentTxNumber = response;
                            console.log(recentTxNumber);
                            if (recentTxNumber > txs) {
                                bot.sendMessage(msg.chat.id, "Внимание! На кошельке " + this.erc20wallet + " произошла транзакция!");
                            }
                        })
                        .catch(error => {
                            console.log(error);
                        });
                }, 20000);
            })
            .catch(error => {
                console.log(error);
            });
    }
}

function BTCWallet(btcwallet, msg) {
    this.btcwallet = btcwallet;
    console.log(this.btcwallet);
    this.message = function() {
        bot.sendMessage(msg.chat.id, "Я оповещу вас, как только на кошельке " + this.btcwallet + " произойдёт новая транзакция!");
    };
    this.txNumber = function() { //method to get number of transactions on wallet
        let recentTxNumber = 0;
        return new Promise((resolve, reject) => {
            https.get('https://blockchain.info/rawaddr/' + this.btcwallet,
                (res) => {
                    let body = '';
                    res.on('data', data => {
                        body += data;
                    });
                    res.on('end', () => {
                        try {
                            let json = JSON.parse(body);
                            recentTxNumber = json.n_tx;
                            resolve(recentTxNumber);
                        } catch (e) {
                            reject(e.message);
                        }
                    });
                }).on('error', (e) => {
                console.error(e);
            });
        });
    };
    this.compareBTCtx = function() { //method which compares the number of transactions on wallet every 'n' seconds, that mentioned on setInterval function
        let scope = this;
        this.txNumber(this.btcwallet).then(response => {
                let txs = response;
                console.log(txs);
                setInterval(function() {
                    scope.txNumber(this.btcwallet)
                        .then(response => {
                            let recentTxNumber = response;
                            console.log(recentTxNumber);
                            if (recentTxNumber > txs) {
                                bot.sendMessage(msg.chat.id, "Внимание! На кошельке " + this.btcwallet + " произошла транзакция!");
                            }
                        })
                        .catch(error => {
                            console.log(error);
                        });
                }, 20000);
            })
            .catch(error => {
                console.log(error);
            });
    }
}