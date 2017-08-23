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
            contentType : "text/javascript",
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
    },

    pasteUploadPic : function(pasteSelect,dragSelect,uploadBtnSelect,toUsernameCallBack,successCall){
        var baseRequest = {
            Uin : WeChatConfig.uin,
            Sid : WeChatConfig.sid,
            Skey : WeChatConfig.skey,
            DeviceID : WeChatConfig.deviceID
        };

        var picUploader = WebUploader.create({
            auto        : true,
            dnd         : dragSelect,
            paste       : pasteSelect,
            swf         : "https://wx.qq.com/zh_CN/htmledition/v2/third_party/webuploader-0.1.5/Uploader.swf",
            server      : "https://file.wx.qq.com/cgi-bin/mmwebwx-bin/webwxuploadmedia?f=json",
            fileVal     : "filename",
            // pick        : uploadBtnSelect,
            compress    : false,
            duplicate   : true,
            threads     : 1,
            chunked     : true,
            chunkSize   : 524288
        });
        // 添加文件前
        picUploader.on("beforeFileQueued",function(file){
            // toUsernameCallBack  获取接收图片人的UserName
            if(!toUsernameCallBack || !toUsernameCallBack()) {
                return false;
            }
            // 检测下微信文件服务器状态
            window.wechat.http({
                url : "https://file.wx.qq.com/cgi-bin/mmwebwx-bin/webwxuploadmedia?f=json",
                type : "OPTIONS"
            });
            file._uploadTime = 0;
            // 设置上传的参数
            var cookies = window.wechat.dealResult(document.cookie);
            file._uploadParams = {
                mediatype : "pic",
                webwx_data_ticket : cookies["webwx_data_ticket"],
                // 前文获取的passticket
                pass_ticket : decodeURIComponent(WeChatConfig.passTicket),
                uploadmediarequest : {
                    // 上传的文件类型
                    UploadType : 2,
                    // 和前文的BaseRequest保持一致
                    BaseRequest : baseRequest,
                    ClientMediaId : window.wechat.uuid(),
                    // 文件大小
                    TotalLen:file.size,
                    StartPos:0,
                    DataLen:file.size,
                    // 多媒体类型
                    MediaType:4,
                    // 发送消息人UserName
                    FromUserName:WeChatConfig.user.UserName,
                    // 接收消息人UserName
                    ToUserName:toUsernameCallBack()
                }
            };
        });
        // 添加文件后
        picUploader.on("fileQueued",function(file){
            // 获取文件的MD5值
            picUploader.md5File(file).then(function(fileMd5) {
                // 设置文件MD5值
                file._uploadParams.uploadmediarequest.FileMd5 = fileMd5;
                // 把uploadmediarequest属性转换成JSON字符串
                file._uploadParams.uploadmediarequest = JSON.stringify(file._uploadParams.uploadmediarequest);
                // 设置上传文件时附带参数
                picUploader.option( 'formData', file._uploadParams);
            });
        });
        // 文件上传成功
        picUploader.on("uploadSuccess",function(file,data){
            if(data) {
                // 满足data.BaseResponse.Ret == 0表示上传成功
                if(data.BaseResponse && data.BaseResponse.Ret == 0) {
                    // 发送消息
                    var localId = window.wechat.uuid();
                    var msg = {
                        Type : 3,
                        Content : "",
                        FromUserName : WeChatConfig.user.UserName,
                        ToUserName :toUsernameCallBack(),
                        LocalID : localId,
                        ClientMsgId : localId,
                        MediaId : data.MediaId
                    };
                    // 上传成功，展示一下
                    if(successCall) {
                        successCall(msg);
                    }
                    var payload = {
                        BaseRequest : baseRequest,
                        Msg : msg,
                        Scene : 0
                    };
                    window.wechat.http({
                        url : "https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxsendmsgimg?fun=async&f=json&pass_ticket="+encodeURIComponent(WeChatConfig.passTicket),
                        async : true,
                        payload : payload,
                        type : "post",
                        success : function (data) {
                            // 同步一下。这个很重要不能省略
                            // window.wechat.massage.receiveMsg();
                        }
                    });
                } else if(file._uploadTime==0) {
                    file._uploadTime++;
                    picUploader.retry(file);
                }
            }
        });
    }
};