/**
 * Create a sound system that provide sound data and send sound data to remote
 * @param path (String) Websocket sound end point to connect to
 * @param nativeSampleRate (Number) The sample rate of the AudioContext
 * @param eventRate (Number) The rate which writeNextSoundBuffer and send will be called (Hz).
 */
SoundSystem = function(path, nativeSampleRate, eventRate){
    var self = this;
    var connection;

    var transmitionRate = 22000;
    var consumeRate = eventRate || 16384;
    var senderResampler = new Resampler(nativeSampleRate, transmitionRate, 1, Math.ceil(consumeRate*transmitionRate/nativeSampleRate)+1);
    var receiveResamplerSet = {};
    var receiverBuffer = new Queue();
    this.receiveFlag = false;

    function getReceiveResampler(senderSampleRate){
        if(receiveResamplerSet[senderSampleRate]) return receiveResamplerSet[senderSampleRate];
        var appendByte = nativeSampleRate/senderSampleRate*consumeRate;
        receiveResamplerSet[senderSampleRate] = new Resampler(transmitionRate, nativeSampleRate, 1, Math.ceil(appendByte));
        return receiveResamplerSet[senderSampleRate];
    }

    var receiveHandle = function (e) {
        if(!self.receiveFlag) return false;
        var array = new Float32Array(e.data);
        var senderSampleRate = array[array.length-1];
        array = getReceiveResampler(senderSampleRate).resampler(array, array.length-1);
        if(receiverBuffer.getLength() > nativeSampleRate*4){
            console.log('receiverBuffer piling up, cleaning the queue...');
            receiverBuffer.empty();
        }
        for(var i = 0; i<array.length; i++){
            receiverBuffer.enqueue(array[i]);
        }
        //console.log('sound received length: ' + array.length);
        //console.log('tailing 2: ' + receiverBuffer.getLength());
    };

    /**
     * start to establish the connection
     */
    self.connect = function () {
        if(connection) return;
        connection = new wsConnection(path, ()=>{}, receiveHandle, false);
        connection.connect();
    };

    /**
     * send sound to remote
     * @param inputBuffer (Float32Array) The data to be transmitted.
     */
    self.send = function(inputBuffer){
        var inputData = senderResampler.resampler(inputBuffer, consumeRate);
        var tobeSent = Float32Array.from({length: inputData.length+1}, (v,k)=>{
            if(k<inputData.length)return inputData[k];return nativeSampleRate; // append source sample rate
        });
        connection.send(tobeSent.buffer);
        //console.log(tobeSent[0]);
    };

    /**
     * write buffered sound data to an array
     * @param bufferToWrite An number array to write to
     * @returns {boolean} True if buffer has been poped successfully
     */
    self.writeNextSoundBuffer = function (bufferToWrite) {
        var bufferLength = receiverBuffer.getLength();
        if(bufferLength > consumeRate){
            for(var i=0; i<consumeRate; i++){
                bufferToWrite[i] = receiverBuffer.dequeue();
            }
            //console.log('tailing: '+(bufferLength-consumeRate));
            return true;
        }else{
            for(var i=0; i<consumeRate; i++){
                bufferToWrite[i] = 0;
            }
            console.log('waiting for sound data... ');
            return false;
        }
    };

    /**
     * Send jump instruction to remote. Remote should later start transmitting sound data in playback mode
     * @param date (Date) The point in time the playback should start from (When sound is recorded).
     */
    self.jumpTo = function (date) {
        if(date) console.log('sound jump to: '+date);
        else console.log('sound jump to live');
        connection.send(JSON.stringify({type:"jump_to", startAt: date}));
        receiverBuffer.empty();
    };

    /**
     * disconnect the system
     */
    self.disconnect = function () {
        connection.close();
        connection = null;
        receiverBuffer.empty();
    };

    /**
     * Object to manage the connection
     */
    function wsConnection(destination, onConnectCallback, receiveCallback, resend) {
        var self = this;
        var ws;
        var reconnectPending = false;

        self.connect = function () {
            // console.error('connect called');
            ws = createWebSocket(destination);
            ws.binaryType = "arraybuffer";
            ws.addEventListener("open", function (e) {
                onConnectCallback(e);
            });
            ws.addEventListener("message", function (e) {
                receiveCallback(e);
            });
            ws.addEventListener('close', function () {
                if(!reconnectPending){
                    console.log('connection to %s closed, reconnect in 1 second', destination);
                    setTimeout(()=>{self.connect(); reconnectPending = false;}, 1000);
                    reconnectPending = true;
                }
            });
            ws.addEventListener('error', function () {
                if(!reconnectPending) {
                    console.log('connection to %s failed, reconnect in 3 second', destination);
                    ws.close();
                    setTimeout(()=>{self.connect(); reconnectPending = false;}, 3000);
                    reconnectPending = true;
                }
            });
        };

        function createWebSocket(path) {
            var protocolPrefix = (window.location.protocol === 'https:') ? 'wss:' : 'ws:';
            return new WebSocket(protocolPrefix + '//' + location.host + path, 'transaction');
        }

        self.send = function (data) {
            if (ws.readyState != ws.OPEN && ws.readyState != ws.CONNECTING) {
                console.log('writing while websocket is not opened, reconnect in 0.5 second');
                if(!reconnectPending) {
                    setTimeout(()=>{self.connect(); reconnectPending = false;}, 500);
                    reconnectPending = true;
                }
                if (resend) {
                    ws.addEventListener('open', function (e) {
                        // remove current event listener
                        e.target.removeEventListener(e.type, arguments.callee);
                        ws.send(data);
                    });
                }
            } else {
                ws.send(data);
            }
        };

        self.reset = function () {
            ws.close();

        };
    }
};



