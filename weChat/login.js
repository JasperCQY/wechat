if (!window.wechat) {
    window.wechat = {};
}
/**
 * http 请求。可以把3个参数换成一个对象参数
 * @param type 可以为空
 * @param url    请求的url
 * @param payload 可以为空
 * @returns {*}
 */
window.wechat.http = function (type, url, payload) {
    var resultData = null;
    var opts = {
        url: url,
        async: false,
        success: function (data) {
            resultData = data;
        }
    };
    if(type && "object" == typeof(type)) {
        $.extend(opts,type);
        if(opts.payload) {
            opts.data = JSON.stringify(opts.payload);
            delete opts.payload;
        }
    } else {

        if ("get" != type && "GET" != type) {
            opts.type = "POST";
        }
        if (payload) {
            opts.data = JSON.stringify(payload);
        }
    }
    $.ajax(opts);
    return resultData;
};
/**
 * get 请求
 * @param url
 * @param payload 可以为空
 * @returns {*}
 */
window.wechat.get = function (url, payload) {
    return window.wechat.http("get", url, payload);
};
/**
 * post请求
 * @param url
 * @param payload 可以为空
 * @returns {*}
 */
window.wechat.post = function (url, payload) {
    return window.wechat.http("post", url, payload);
};

/**
 * 处理微信返回的“property1: value1; property2: value2”结果
 * @param result
 * @returns {Object}
 */
window.wechat.dealResult = function (result) {
    var resultMap = [];
    var reg = /([\w\.]+)\s?=\s?(\d+|'[\W\w]+'|"[\W\w]+"|\{[\w:",]+\})/ig;
    var item = null;
    if (result) {
        while (item = reg.exec(result)) {
            if (item[2] && ('"' == item[2].charAt(0) || "'" == item[2].charAt(0))) {
                item[2] = item[2].substring(1, item[2].length - 1);
            }
            resultMap[item[1]] = item[2];
        }
    }
    return resultMap;
};

/**
 * 登录相关
 */
window.wechat.login = {
    /**
     * 获取uuid
     * @returns {*|string}
     */
    requestUuid: function () {
        var result = window.wechat.get(weChatUrl.uuidUrl());
        var resultMap = window.wechat.dealResult(result);
        if ("200" == resultMap["window.QRLogin.code"]) {
            WeChatConfig.uuid = resultMap["window.QRLogin.uuid"];
        }
        return WeChatConfig.uuid;
    },

    /**
     * 一般用不上，请直接使用img标签，src填写weChatUrl.qrCodeUrl(uuid)
     * @param uuid
     */
    requestQrCode: function (uuid) {
        var resultBytes = null;
        $.ajax({
            url: weChatUrl.qrCodeUrl(uuid),
            type: "GET",
            dataType: 'binary',
            async: false,
            processData: false,
            success: function (result) {
                resultBytes = result;
            }
        });
        return resultBytes;
    },

    /**
     * 私有方法，外部不要调用。监控手机是否扫面以及确认登录
     * @param uuid         uuid
     * @param headImgCall   获取头像成功后的回调函数
     * @param successCall   登录成功后的回调函数
     * @param isFirst  是否是第一次调用
     */
    confirmScanAndClick : function(uuid,headImgCall,successCall, isFirst){
        isFirst = (isFirst ? 1 : 0);
        // 异步
        window.wechat.http({
            url : weChatUrl.loopConfirmPhoneUrl(uuid,isFirst),
            async : true,
            success : function (data) {
                var resultMap = window.wechat.dealResult(data);
                if ("408" == resultMap["window.code"]) {
                    // 继续
                    window.wechat.login.confirmScanAndClick(uuid,headImgCall,successCall, false);
                } else if ("201" == resultMap["window.code"]) {
                    // 扫描。返回用户头像
                    if(headImgCall) {
                        headImgCall(resultMap["window.userAvatar"]);
                    }
                    window.wechat.login.confirmScanAndClick(uuid,headImgCall,successCall, false);
                } else if ("200" == resultMap["window.code"]) {
                    // 确认登录，取得跳转的url
                    window.wechat.http({
                        url : weChatUrl.loginUrl(resultMap["window.redirect_uri"]),
                        async : true,
                        success : function(data){
                            var rep = /<skey>([@\w]+)<\/skey>/;
                            WeChatConfig.skey = rep.exec(data)[1];
                            rep = /<wxsid>([@\w/+]+)<\/wxsid>/;
                            WeChatConfig.sid = rep.exec(data)[1];
                            rep = /<wxuin>([@\w_]+)<\/wxuin>/;
                            WeChatConfig.uin = parseInt(rep.exec(data)[1]);
                            rep = /<pass_ticket>([@\w_\%]+)<\/pass_ticket>/;
                            WeChatConfig.passTicket = rep.exec(data)[1];
                            if(successCall) {
                                successCall(WeChatConfig);
                            }
                        }
                    });
                } else if("400" == resultMap["window.code"]) {
                    // 二维码失效，请重新扫描登录。
                    successCall(null);
                } else {
                    // 异常
                    console.log("出问题了:"+data);
                    console.log(resultMap);
                    successCall(null);
                }
            }
        });
    },
    /**
     * 监控手机是否扫面以及确认登录
     * @param uuid
     * @param headImgCall  获取头像成功后的回调函数
     * @param successCall  登录成功后的回调函数，参数为null时表示二维码已经失效
     */
    loopConfirmLogin : function(uuid,headImgCall,successCall){
        // 第一次
        window.wechat.login.confirmScanAndClick(uuid,headImgCall,successCall,true);
    },
    /**
     * 初始化（用户信息、群信息、订阅信息、系统时间、SyncKey）
     * @param passTicket
     * @returns {*}
     */
    wxInit : function (passTicket) {
        WeChatConfig.deviceID = WeChatConfig.createDeviceID();
        var payload = {BaseRequest:{
            Uin : WeChatConfig.uin,
            Sid : WeChatConfig.sid,
            Skey : WeChatConfig.skey,
            DeviceID : WeChatConfig.deviceID
        }};
        var result = window.wechat.http({
            url : weChatUrl.wxInitUrl(encodeURIComponent(passTicket)),
            payload : payload,
            dataType : "json",
            type : "post"
        });
        // SyncKey
        WeChatConfig.syncKey = result.SyncKey;
        // 当前用户
        WeChatConfig.user = result.User;
        // 群聊
        if(result.Count && result.ContactList) {
            var contact = null;
            var userName = null;
            var members = [];
            for (var i = 0; i < result.Count; i++) {
                // "Uin": 0,"UserName": "@@05e1a","NickName": "", "HeadImgUrl": "","ContactFlag": 0,"MemberCount": 46,"MemberList":[],"RemarkName": "","HideInputBarFlag": 0,"Sex": 0,"Signature": "","VerifyFlag": 0,"OwnerUin": 0,"PYInitial": "","PYQuanPin": "","RemarkPYInitial": "","RemarkPYQuanPin": "","StarFriend": 0,"AppAccountFlag": 0,"Statues": 0,"AttrStatus": 0,"Province": "","City": "","Alias": "","SnsFlag": 0,"UniFriend": 0,"DisplayName": "","ChatRoomId": 0,"KeyWord": "","EncryChatRoomId": "","IsOwner": 0
                contact = result.ContactList[i];
                if(contact.UserName && contact.UserName.indexOf("@@") == 0) {
                    // 群
                    members.push({
                        EncryChatRoomId : "",
                        UserName : contact.UserName
                    });
                } else {
                    // 微信内置（比如：文件助手）
                    WeChatConfig.BatchContactMap[userName] = contact;
                }
            }
            // 处理微信群
            var contacts = wechat.login.getBatchContact(passTicket,members);
            if(contacts && contacts.length > 0) {
                var member = null;
                for(var i = 0; i < contacts.length; i++) {
                    contact = contacts[i];
                    userName = contact.UserName.replace(/@/ig, "g");
                    WeChatConfig.BatchContactMap[userName] = contact;
                    if(contact.MemberCount && contact.MemberCount>0) {
                        contact.MemberMap = [];
                        for(var im = 0; im < contact.MemberCount; im++) {
                            member = contact.MemberList[im];
                            contact.MemberMap[member.UserName] = member;
                        }
                        delete contact.MemberList;
                    }
                }
            }
        }
        // 订阅消息
        // result.MPSubscribeMsgCount;
        // result.MPSubscribeMsgList;
        // 系统时间：result.SystemTime
        return result;
    },
    /**
     * 群联系人
     * @param pass_ticket
     */
    getBatchContact : function (pass_ticket,list) {
        var result = window.wechat.http({
            url : weChatUrl.getBatchContactUrl(pass_ticket),
            dataType : "json",
            type : "post",
            payload : {
                BaseRequest : {
                    Uin : WeChatConfig.uin,
                    Sid : WeChatConfig.sid,
                    Skey : WeChatConfig.skey,
                    DeviceID : WeChatConfig.deviceID
                },
                Count : list.length,
                List : list
            }
        });
        // 把联系人放进联系人Map中
        if(result.BaseResponse && result.BaseResponse.Ret == 0 && result.Count > 0) {
            return result.ContactList;
        }
        return null;
    },
    /**
     * 获取联系人
     * @param pass_ticket
     * @param skey
     * @returns {Object} 联系人列表
     */
    getContact : function (pass_ticket,skey) {
        var result = window.wechat.http({
            url : weChatUrl.getContactUrl(pass_ticket,skey),
            dataType : "json",
            type : "get"
        });
        // 把联系人放进联系人Map中
        if(result.BaseResponse && result.BaseResponse.Ret == 0) {
            var user = null;
            for(var i = 0; i < result.MemberCount; i++) {
                user = result.MemberList[i];
                WeChatConfig.ContactMap[user.UserName.replace(/@/ig,"a")] = user;
            }
        }
        return result;
    }
};