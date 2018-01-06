function DiscussionBoard(transactionSystem, newPost, addReplies) {
    var self = this;
    this.moduleName = 'discussion_board';
    var ignoreTransaction = {};
    var threads = {}; // map for div of threads

    this.newThread = function (message, options) {
        var threadID = guid();
        ignoreTransaction[threadID] = true;

        var posx = Math.random();
        var posy = Math.random();

        var color = selectPostColor();

        return transactionSystem.newTransaction(self.moduleName, {
            type: 'new_thread',
            id: threadID
        }, {type: 'new_thread', message, posx, posy, color, id: threadID}).then(function (result) {
            threads[threadID] = {div: newPost(message, posx, posy, color, threadID)};
        }).catch(function (err) {
            console.error('fail to create thread transaction');
            console.error(err);
            delete ignoreTransaction[threadID];
            throw err;
        });
    };

    this.newReply = function (message, replyTo) {
        console.assert(threads[replyTo]);
        var replyID = guid();
        ignoreTransaction[replyID] = true;
        return transactionSystem.newTransaction(self.moduleName, {
            type: 'new_thread_reply',
            id: replyID
        }, {type: 'new_thread_reply', replyTo, message}).then(function (result) {
            addReplies(threads[replyTo].div, message);
        }).catch(function (err) {
            console.error('fail to create thread reply transaction');
            console.error(err);
            delete ignoreTransaction[replyID];
            throw err;
        });
    };

    this.update = function (index, description, createdBy, createdAt, payload) {
        if(ignoreTransaction[description.id]) {
            delete ignoreTransaction[description.id];
            return;
        }
        if(payload.type == 'new_thread'){
            threads[payload.id] = {div: newPost(payload.message, payload.posx, payload.posy, payload.color, payload.id)};
        }else if(payload.type == 'new_thread_reply'){
            console.assert(threads[payload.replyTo]);
            addReplies(threads[payload.replyTo].div, payload.message);
        }else{
            console.assert(false, 'unknown transaction');
            console.error(payload);
        }
    };
    this.reset = function () {
        for (var key in threads) {
            if (threads.hasOwnProperty(key)) {
                $(threads[key].div).remove();
                delete threads[key];
            }
        }
        ignoreTransaction = {};
        threads = {};
    };

    function guid() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
            s4() + '-' + s4() + s4() + s4();
    }
}
