function SoundControl(transactionSystem) {
    var self = this;
    self.moduleName = 'sound_control';
    self.asSpeaker = false;
    self.asListener = false;
    self.inited = false;
    self.speakerList = {};

    /**
     * Init the control.
     * Called after all transaction has been received.
     */
    self.init = function(){
        self.inited = true;
        if((self.asSpeaker || self.asListener) && transactionSystem.liveFlag) {
            if(self.asSpeaker) document.dispatchEvent(events.switchToSpeaker());
            if(self.asListener) document.dispatchEvent(events.switchToListener());
        }else{ // if no transaction about sound control has been made
            if(transactionSystem.privilege.indexOf(self.moduleName) >=0 ){ // if this user is a "native" speaker
                transactionSystem.newTransaction(self.moduleName, {speakerChange: [[transactionSystem.userID, true]]}, {});
            }else{
                self.asListener = true;
            }
        }
    };

    this.update = function (index, description, createdBy, createdAt, payload) {
        var speakerChange = description.speakerChange;
        console.log('speaker change received: '+speakerChange);
        var newSpeakers = [];
        var changed = false;
        speakerChange.forEach(function (changeTuple) {
            if(changeTuple[1]) newSpeakers.push(changeTuple[0]);
            if(changeTuple[0] == transactionSystem.userID){
                if(self.asSpeaker != changeTuple[1] || self.asListener != !changeTuple[1])
                    changed = true;
                self.asSpeaker = changeTuple[1];
                self.asListener = !changeTuple[1];
                if(self.inited && transactionSystem.liveFlag){
                    if(self.asSpeaker) document.dispatchEvent(events.switchToSpeaker({changed}));
                    if(self.asListener) document.dispatchEvent(events.switchToListener({changed}));
                }
            }
            if(changeTuple[1]){
                self.speakerList[changeTuple[0]] = true;
            }else{
                delete self.speakerList[changeTuple[0]];
            }
        });
        if(newSpeakers.length && !changed && self.inited){
            document.dispatchEvent(events.newSpeakers({newSpeakers}));
        }
        changeUserList();
    };

    /**
     * Assign new speaker. User will no longer send sound data after.
     * @param userID (string)
     * @returns {Promise}
     */
    this.giveSpeakerRoleTo = function (userID) {
        if(userID == transactionSystem.userID) return self.takeSpeakerRole();
        if(transactionSystem.privilege.indexOf(self.moduleName) == 0) return Promise.reject(new Error('not in control')); // if user has no control on sound control
        var speakerChange = [];
        for(let userID in self.speakerList){
            speakerChange.push([userID, false]);
        }
        speakerChange.push([userID, true]);
        return transactionSystem.newTransaction(self.moduleName, {speakerChange}, {});
    };

    /**
     * take speaker role from all speaker.
     * @param userID (string) user to take
     * @returns {Promise.<*>}
     */
    this.takeSpeakerRole = function () {
        if(transactionSystem.privilege.indexOf(self.moduleName) == 0) return Promise.reject(new Error('not in control')); // if user has no control on sound control
        var speakerChange = [[transactionSystem.userID, true]];
        for(var userID in self.speakerList){
            speakerChange.push([userID, false]);
        }
        return transactionSystem.newTransaction(self.moduleName, {speakerChange}, {});
    };

    this.reset = function () {

    };

    function changeUserList(){
        var userList = [];
        for(var userID in transactionSystem.userList){
            userList.push({
                id:userID,
                name: transactionSystem.userList[userID].name || transactionSystem.userList[userID].email,
                role: self.speakerList[userID]?'speaker':'non-speaker'
            });
        }
        updateStudentList(userList);
    }
}
