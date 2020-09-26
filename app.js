const needle = require('needle');
const websocket = require('ws');

class FilteredStream {
    token;
    url;

    constructor(callback) {
        this.callback = callback;
        this.token = process.env.BEARER_TOKEN;
        this.url = 'https://api.twitter.com/2/tweets/search/stream';
    }

    callback() {
    }

    streamConnect() {
        const options = {timeout: 20000};
        const stream = needle.get(this.url, {
            headers: {
                Authorization: `Bearer ${this.token}`
            }
        }, options);

        stream.on('data', data => {
            try {
                const json = JSON.parse(data);
                console.log(json);
                this.callback(json);
            } catch (e) {
            }
        }).on('error', error => {
            if (error.code === 'ETIMEDOUT') {
                stream.emit('timeout');
            }
        });

        return stream;
    }

    async connect() {
        console.log("Watching stream...");
        const filteredStream = this.streamConnect();
        let timeout = 0;
        filteredStream.on('timeout', () => {
            console.warn('Connection error. Reconnecting...');
            setTimeout(() => {
                timeout++;
                this.streamConnect();
            }, 2 ** timeout);
            this.streamConnect();
        })
    }
}

class UnitySocket {
    server;
    port;
    clients;

    constructor() {
        this.clients = [];
        this.port = 8001;
        this.server = new websocket.Server({port: this.port});

        this.server.on('connection', ws => {
            this.clients.push(ws);

            ws.on('message', message => {
                console.log(message);
                console.log(this.clients);
            });

            ws.on('close', () => {
                console.log('closed');
            })
        });
        console.log("Websocket server is ready.");

        this.send = this.send.bind(this);
    }

    send(data) {
        try {
            console.log("send called");
            this.clients.forEach(client => {
                client.send(JSON.stringify(data));
            });
            console.log("send");
        } catch (e) {
            e.stack ? console.warn(e.stack) : console.warn(e.message);
        }
    }
}

const unity = new UnitySocket();
const stream = new FilteredStream(unity.send);
stream.connect();

