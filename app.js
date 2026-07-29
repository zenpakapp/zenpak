const crypto = require('crypto');
const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const config = require('config');
const express = require('express');
const fs = require('fs');
const http = require('http');
const morgan = require('morgan');
const path = require('path');

const { logger } = require('./server/log.js');
const {
    REQUEST_BODY_LIMIT,
    securityHeaders,
    errorHandler,
} = require('./server/security.js');

function getRuntimeNumber(name, fallback) {
    const value = process.env[name];

    if (typeof value === 'undefined' || value === '') {
        return fallback;
    }

    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
}

function getRuntimeEnvironment() {
    return process.env.NODE_ENV || config.get('environment');
}

morgan.token('username', function getUsername (req) {
    return req.lighterpackusername
});


morgan.token('requestid', function getUsername (req) {
    return req.uuid
});

const app = express();
const runtimeEnvironment = getRuntimeEnvironment();
const appPort = getRuntimeNumber('PORT', config.get('port'));
const devServerPort = getRuntimeNumber('DEV_SERVER_PORT', config.get('devServerPort'));
app.enable('trust proxy');
app.disable('x-powered-by');
app.use(securityHeaders({ environment: getRuntimeEnvironment() }));

app.use(function (req, res, next) {
    req.uuid = crypto.randomUUID();
    next();
});

app.use(morgan(function (tokens, req, res) {
    return JSON.stringify({
        'timestamp': tokens.date(req, res, 'iso'),
        'requestid': tokens.requestid(req, res),
        "remote-addr": tokens['remote-addr'](req, res),
        'method': tokens.method(req, res),
        'http-version': tokens['http-version'](req, res),
        'user-agent': tokens['user-agent'](req, res),
        'url': tokens.url(req, res),
        'status': tokens.status(req, res),
        'referrer': tokens.referrer(req, res),
        'content-length': tokens.res(req, res, 'content-length'),
        'response-time': tokens['response-time'](req, res),
        'username': tokens.username(req, res),
    })
}, { stream: logger.stream.write }));

const oneDay = 86400000;
const oneYear = 31536000000;

app.use(compression());
app.use(cookieParser());

const webhookHandler = require('./server/webhook-handler.js');
// Webhook MUST be before express.json() — needs raw body for signature verification
app.use('/', webhookHandler);

app.use(express.json({ limit: REQUEST_BODY_LIMIT }));
app.use(express.urlencoded({
    extended: true,
    limit: REQUEST_BODY_LIMIT,
}));

function serveCurrentDistAsset(entryName, extension) {
    return (req, res, next) => {
        const manifestPath = path.join(__dirname, 'public/dist/assets.json');
        if (!fs.existsSync(manifestPath)) return next();

        try {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            const assetFiles = manifest.files?.[entryName] || [];
            const assetName = assetFiles.find(name => name.startsWith(`${entryName}.`) && name.endsWith(extension))
                || assetFiles.find(name => name.endsWith(extension));
            if (!assetName) return next();
            return res.sendFile(path.join(__dirname, 'public/dist', assetName));
        } catch (err) {
            return next(err);
        }
    };
}

function proxyDevDistAsset(req, res, next) {
    const proxyReq = http.get({
        hostname: '127.0.0.1',
        port: devServerPort,
        path: `/dist${req.url}`,
        headers: {
            accept: req.headers.accept || '*/*',
        },
    }, (proxyRes) => {
        if (!proxyRes.statusCode || proxyRes.statusCode >= 400) {
            proxyRes.resume();
            next();
            return;
        }

        res.status(proxyRes.statusCode);
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        Object.entries(proxyRes.headers).forEach(([name, value]) => {
            const lowerName = name.toLowerCase();
            if (value && lowerName !== 'content-security-policy' && lowerName !== 'cache-control') {
                res.setHeader(name, value);
            }
        });
        proxyRes.pipe(res);
    });

    proxyReq.on('error', next);
}

if (runtimeEnvironment !== 'production') {
    app.use('/dist', proxyDevDistAsset);
}

app.get('/dist/app.js', serveCurrentDistAsset('app', '.js'));
app.get('/dist/app.css', serveCurrentDistAsset('app', '.css'));
app.get('/dist/share.js', serveCurrentDistAsset('share', '.js'));
app.get('/dist/share.css', serveCurrentDistAsset('share', '.css'));

app.use('/dist', express.static(`${__dirname}/public/dist/`, {
    immutable: runtimeEnvironment === 'production',
    maxAge: runtimeEnvironment === 'production' ? oneYear : oneDay,
}));
app.use(express.static(`${__dirname}/public/`, { maxAge: oneDay }));
const passport = require('passport');
const db = require('./server/db.js');
const endpoints = require('./server/endpoints.js');
const moderationEndpoints = require('./server/moderation-endpoints.js');
const notificationEndpoints = require('./server/notification-endpoints.js');
const reportEndpoints = require('./server/report-endpoints.js');
const oauthEndpoints = require('./server/oauth.js');
const views = require('./server/views.js');

db.ensureIndexes().catch((err) => logger.error('Index creation failed', { err }));

app.use(passport.initialize());
app.use('/', endpoints);
app.use('/', moderationEndpoints);
app.use('/api/notifications', notificationEndpoints);
app.use('/api/reports', reportEndpoints);
app.use('/', oauthEndpoints);

const billingEndpoints = require('./server/billing-endpoints.js');
app.use('/api/billing', billingEndpoints);

app.use('/', views);
app.use(errorHandler);

logger.info("Starting up Lighterpack...");

let webpackConfig;

if (runtimeEnvironment === 'production') {
    webpackConfig = require('./webpack.config');
} else {
    webpackConfig = require('./webpack.development.config');
}

const webpackCompiler = webpack(webpackConfig);

// Default port is 3000; we can have multiple bindings
config.get('bindings').map(
    (bind) => {
        app.listen(appPort, bind);
        logger.info(`Listening on [${bind}]:${appPort}`);
    },
);

if (runtimeEnvironment !== 'production') {
    const devServerOptions = {
        ...(webpackConfig.devServer || {}),
        port: devServerPort,
        proxy: {
            '*': {
                target: `http://127.0.0.1:${appPort}`,
                secure: false,
                changeOrigin: true,
            },
        },
    };
    const devServer = new WebpackDevServer(devServerOptions, webpackCompiler);

    devServer.startCallback((err) => {
        if (err) {
            return logger.info(err);
        }

        logger.info(`Webpack dev server listening on port ${devServerPort}`);
    });
}
