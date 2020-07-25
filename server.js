const express = require('express');
const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');

const dev = '/dev/ttyUSB0';
const rate = 115200;

// serial interface boilerplate

const port = new SerialPort(dev, { baudRate: rate });

const parser = new Readline({ delimiter: '\r\n' });
port.pipe(parser);

function login(line) {
    console.log(`> ${line}`);
}

function logout(line) {
    console.log(`< ${line}`);
}

function push() {
    parser.on('data', login);
}

function pull(cmd) {
    logout(cmd);
    port.write(cmd + '\n');
    return new Promise((resolve, reject) => {
        parser.on('data', line => {
            login(line);
            if (line == 'ok') resolve();
            else reject(line);
        });
    });
}

push();

// REST routing

const app = express();

const cors = express.Router();
cors.all('*', (req, res, next) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Headers', '*');
    res.set('Access-Control-Allow-Methods', '*');
    next();
});

app.use(cors);
app.use(express.text());
app.use(express.json());
app.use(express.static('public'));

function withStatus(promise, resp) {
    resp.set('Content-Type', 'text/plain');

    return promise
    .then(() => resp.status(200).send('ok'))
    .catch((msg) => resp.status(400).send(msg));
}

app.post('/homing', (req, resp) => {
    let cmd = '$h\n'; // homing command
    withStatus(pull(cmd), resp);
});

app.post('/cmd', (req, resp) => {
    let cmd = req.body;
    if (cmd) {
        cmd = cmd.trim() + '\n';
        withStatus(pull(cmd), resp);
    } else {
        resp.status(400).send('Command expected (text/plain).');
    }
});

app.post('/move', (req, resp) => {
    let coords = req.body;
    if (coords) {
        // TODO check JSON schema
        cmd = `M20 G90 G0 X${coords.x || 0} Y${coords.y || 0} Z${coords.z || 0} A0 B0 C0 F2000\n`;
        withStatus(pull(cmd), resp);
    } else {
        resp.status(400).send('Coordinates expected (application/json).');
    }
});

app.post('/grasp', (req, resp) => {
    let cmd = 'M3S1000\n'; // command to open air pump (PWM of 1000)
    withStatus(pull(cmd), resp);
});

app.post('/release', (req, resp) => {
    let cmd = 'M3S0\n'; // command to close air pump
    withStatus(pull(cmd), resp);
});

app.listen('8080');