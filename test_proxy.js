var redbird = require('redbird')({
    port: 80,
    secure: false,
    ssl: {
        port: 443,
    }
});
redbird.register("recilive.stream", "http://localhost:3000", {ssl: {
    key: 'recilive.stream.key',
    cert: 'recilive.stream.cert',
    redirect: false
}});
// redbird.register("room.recilive.stream", "http://localhost:3001", {});
redbird.register("room.recilive.stream", "http://localhost:3001", {
    ssl: {
        key: 'room.recilive.stream.key',
        cert: 'room.recilive.stream.cert',
        redirect: false
    }
});