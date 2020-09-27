const needle = require('needle');
const websocket = require('ws');

let testObject = '{"data":{"author_id":"1221855747954208768","id":"1309906146795290624","text":"だめくさい #フレネルさんテスト"},"includes":{"users":[{"id":"1221855747954208768","name":"フレネル","username":"fres_nel"}]},"matching_rules":[{"id":1308202563854950400,"tag":null}]}';

class FilteredStream {
    token;
    url;

    constructor(callback) {
        this.callback = callback;
        this.token = process.env.BEARER_TOKEN;
        this.url = 'https://api.twitter.com/2/tweets/search/stream?expansions=author_id';
    }

    callback() {
    }

    parse(raw) {
        const json = JSON.parse(raw);
        const result = {
            username: json.include.users[0].name,
            userid: json.include.users[0].username,
            tweet: json.text
        };
        return result;
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
                const json = this.parse(data);
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
                this.send({text: "test message"});
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

const testjson = stream.parse(testObject);
console.log(testjson);

