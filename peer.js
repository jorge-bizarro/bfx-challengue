const { PeerRPCClient, PeerRPCServer } = require('grenache-nodejs-http')
const Link = require('grenache-nodejs-link')

let isAlive = false;

class Order {
    /**
     * 
     * @param {'buy' | 'sell'} type 
     * @param {number} price 
     * @param {number} amount 
     */
    constructor(type, price, amount) {
        this.type = type
        this.price = price
        this.amount = amount
    }
}

class Orderbook {
    constructor() {
        this.buyOrders = []
        this.sellOrders = []
    }

    /**
     * 
     * @param {Order} order 
     */
    addOrder(order) {
        const listToAddMap = {
            'buy': this.buyOrders,
            'sell': this.sellOrders
        }

        listToAddMap[order.type]?.push(order);

        console.log('Orderbook -> Bids:');
        console.table(this.buyOrders)

        console.log('Orderbook -> Asks:');
        console.table(this.sellOrders);
    }
}

const orderbook = new Orderbook();

const link = new Link({
    grape: 'http://127.0.0.1:30001',
    requestTimeout: 300000
})

link.start()

const peerServer = new PeerRPCServer(link, { timeout: 300000 })
peerServer.init()

const peerClient = new PeerRPCClient(link, {})
peerClient.init()

const port = 1024 + Math.floor(Math.random() * 1000)
const service = peerServer.transport('server')

service.listen(port)

setInterval(function () {
    link.announce('exchange_service', service.port, {})
    isAlive = true
}, 1000)

service.on('request', (rid, key, payload, handler) => {
    if (payload.type === 'newOrder') {
        orderbook.addOrder(payload.order)

        handler.reply(null, {
            type: 'newOrder',
            order: payload.order
        })
    }
})


/**
 * 
 * @param {'buy' | 'sell'} type 
 * @param {number} price 
 * @param {number} amount 
 */
async function submitOrder(type, price, amount) {
    const order = new Order(type, price, amount)

    peerClient.request('exchange_service', { type: 'newOrder', order: order }, { timeout: 10000 }, (err, data) => {
        if (err) {
            console.log('Error submitting order:', err)
            process.exit(-1)
        } else {
            console.log('Submitted order:')
        }
    })
}

async function main() {
    const [_, __, type, price, amount] = process.argv;

    console.log('Running...');

    const intervalId = setInterval(async () => {
        console.log('Checking if connection is alive...', isAlive);

        if (isAlive) {
            clearInterval(intervalId);
            console.log('Submitting order...');
            await submitOrder(type, +price, +amount)
        }

    }, 2000);

}

main();
