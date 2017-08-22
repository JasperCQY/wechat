if (!window.wechat) {
    window.wechat = {};
}

window.wechat.uuid = function(){
    function S4(){
        return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
    }
    return (S4()+S4()+S4()+S4()+S4()+S4()+S4()+S4());
};

window.wechat.massage = {
    /**
     * 心跳（轮询）
     * @param receiveMsg
     * @param errorCall
     */
    heartbeat : function(receiveMsg, errorCall){
        window.wechat.http({
            url : weChatUrl.heartbeatUrl(WeChatConfig),
            async : true,
            success : function (data) {
                var resultMap = window.wechat.dealResult(data);
                var synccheck = eval("("+resultMap["window.synccheck"]+")");
                if(synccheck.retcode == 0) {
                    // 正常
                    if(synccheck.selector == 0) {
                        // 没有消息。继续同步
                    } else if (synccheck.selector == 2) {
                        // 有消息。接收消息后,继续同步。
                        window.wechat.massage.receiveMsg(receiveMsg);
                    }
                    // 同步
                    window.wechat.massage.heartbeat(receiveMsg, errorCall);
                } else {
                    // 退出
                    errorCall(synccheck);
                }
            }
        });
    },
    receiveMsg : function(callBack){
        var payload = {
            BaseRequest : {
                Uin : WeChatConfig.uin,
                Sid : WeChatConfig.sid,
                Skey : WeChatConfig.skey,
                DeviceID : WeChatConfig.deviceID
            },
            SyncKey : WeChatConfig.syncKey,
            rr : new Date().getTime()
        };
        var msg = window.wechat.post(weChatUrl.receiveMsgUrl(WeChatConfig.sid,WeChatConfig.skey,WeChatConfig.passTicket),payload);
        msg = JSON.parse(msg);
        if(msg.SyncKey) {
            WeChatConfig.syncKey = msg.SyncKey;
        }
        // 把消息存储
        if(callBack) {
            // 新消息数量大于0
            if (msg.AddMsgCount && msg.AddMsgCount > 0) {
                var msgItem = null;
                for (var i = 0; i < msg.AddMsgCount; i++) {
                    msgItem = msg.AddMsgList[i];
                    // msgItem.FromUserName
                    // msgItem.ToUserName
                    // msgItem.MsgId
                    // msgItem.MsgType
                    // msgItem.Content
                    // msgItem.CreateTime
                    callBack(msgItem);
                }
            }
        }
    },
    sendMsg : function(msg,callBack){
        if(!msg || "object"!=typeof(msg)) {
            return;
        }
        var payload = {
            BaseRequest : {
                Uin : WeChatConfig.uin,
                Sid : WeChatConfig.sid,
                Skey : WeChatConfig.skey,
                DeviceID : WeChatConfig.deviceID
            },
            Msg : msg,
            Scene : 0
        };
        window.wechat.http({
            url : weChatUrl.sendMsgUrl(WeChatConfig.passTicket),
            async : true,
            payload : payload,
            type : "post",
            success : function (data) {
                callBack(msg);
            }
        });
    },

    getMsgPic : function(msgId, skey, callBack){
        window.wechat.http({
            url : weChatUrl.getMsgPicUrl(msgId, skey),
            async : true,
            success : function (data) {
                callBack(msgId);
            }
        });
    }
};