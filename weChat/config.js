var WeChatConfig = {
    host : "https://wx.qq.com",
    uuid : "",
    deviceID : "",
    skey : "",
    sid : "",
    uin : 0,
    passTicket : "",
    user : {
        Uin : 0,
        UserName : "",
        NickName : "",
        HeadImgUrl : "",
        RemarkName : "",
        PYInitial : "",
        PYQuanPin : "",
        RemarkPYInitial : "",
        RemarkPYQuanPin : "",
        HideInputBarFlag : 0,
        StarFriend : 0,
        Sex : 1,
        Signature : "",
        AppAccountFlag : 0,
        VerifyFlag : 0,
        ContectFlag : 0,
        WebWxPluginSwitch : 0,
        HeadImgFlag : 1,
        SnsFlag : 0
    },
    syncKey : { Count : 0, List :[]},
    /**
     * 群联系人。
     * key UserName(把@换成g之后的UserName)
     * value { Uin : 12323, UserName:"", NickName:"",... MemberList:[], MemberListMap:{},...}
     */
    BatchContactMap : {},
    /**
     * 联系人
     * key UserName(把@换成a之后的UserName)
     * value { Uin : 12323, UserName:"", NickName:"",... }
     */
    ContactMap : {},
    /**
     * 消息
     * key UserName 与当前用户联系的联系人
     * value []  成员格式{ FromUserName :"", ToUserName : ""}
     */
    ContactMsgMap : {},
    /**
     * 获取联系人
     * @param userName
     */
    getContact : function(userName){
        var user = null;
        if(userName.charAt(0) == '@') {
            if(userName.charAt(1) == '@') {
                // 群消息
                userName = userName.replace(/@/ig, "g");
                user = WeChatConfig.BatchContactMap[userName];
            } else {
                // 联系人消息
                userName = userName.replace(/@/ig,"a");
                user = WeChatConfig.ContactMap[userName];
            }
        } else {
            user = WeChatConfig.BatchContactMap[userName];
            if(!user) {
                user = WeChatConfig.ContactMap[userName];
            }
        }
        return user;
    },
    syscKeyStr : function(){
        if(WeChatConfig.syncKey && WeChatConfig.syncKey.Count && WeChatConfig.syncKey.Count > 0){
            var resultKey = "";
            for(var i = 0; i < WeChatConfig.syncKey.List.length; i++) {
                resultKey += WeChatConfig.syncKey.List[i].Key + '_' + WeChatConfig.syncKey.List[i].Val + '|';
            }
            if(resultKey) {
                resultKey = resultKey.substring(0,resultKey.length-1)
                return resultKey;
            }
        }
        return "";
    },
    createDeviceID : function () {
        var ticket = "e"+parseInt(Math.random() * 1000000000000000);
        if(ticket.length == 16) {
            return ticket;
        } else {
            return WeChatConfig.createDeviceID();
        }
    }
};