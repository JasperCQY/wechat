var weChatUrl = {
    UUID_URL: "https://login.wx.qq.com/jslogin?appid=wx782c26e4c19acffb&redirect_uri=https%3A%2F%2Fwx.qq.com%2Fcgi-bin%2Fmmwebwx-bin%2Fwebwxnewloginpage&fun=new&lang=zh_CN&_={0}",
    QR_CODE_URL: "https://login.weixin.qq.com/qrcode/{0}",
    LOOP_CONFIRM_PHONE_URL: "https://login.wx.qq.com/cgi-bin/mmwebwx-bin/login?loginicon=true&uuid={0}&tip={1}&r={2}&_={2}",
    LOGIN_URL: "{0}&fun=new&version=v2",
    WX_INIT_URL: "https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxinit?r={0}&lang=zh_CN&pass_ticket={1}",
    HEARTBEAT_URL: "https://webpush.wx.qq.com/cgi-bin/mmwebwx-bin/synccheck?r={0}&skey={1}&sid={2}&uin={3}&deviceid={4}&synckey={5}&_={0}",
    RECEIVE_MSG_URL: "https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxsync?sid={0}&skey={1}&lang=zh_CN&pass_ticket={2}",
    GET_CONTACT_URL : "https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxgetcontact?pass_ticket={0}&r={2}&seq=0&skey={1}",
    /**
     * 群联系人
     */
    GET_BATCK_CONTACT_URL : "https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxbatchgetcontact?type=ex&r={0}&lang=zh_CN&pass_ticket={1}",
    SEND_MSG_URL : "https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxsendmsg?pass_ticket={0}",
    GET_MSG_PIC_URL : "https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxgetmsgimg?&MsgID={0}&skey={1}",

    uuidUrl: function () {
        return weChatUrl.UUID_URL.format("" + new Date().getTime());
    },

    qrCodeUrl: function (uuid) {
        return weChatUrl.QR_CODE_URL.format("" + uuid);
    },
    /**
     *
     * @param uuid
     * @param tip 第一次询问tip为1，之后tip为0
     */
    loopConfirmPhoneUrl: function (uuid, tip) {
        return weChatUrl.LOOP_CONFIRM_PHONE_URL.format(uuid, tip, "" + new Date().getTime());
    },

    loginUrl: function (redirect_uri) {
        return weChatUrl.LOGIN_URL.format(redirect_uri);
    },
    wxInitUrl: function (passTicket) {
        return weChatUrl.WX_INIT_URL.format("" + new Date().getTime(), encodeURIComponent(passTicket));
    },
    heartbeatUrl: function (conf) {
        return weChatUrl.HEARTBEAT_URL.format("" + new Date().getTime(), encodeURIComponent(conf.skey), encodeURIComponent(conf.sid), conf.uin, conf.deviceID, encodeURIComponent(conf.syscKeyStr()));
    },
    receiveMsgUrl: function (sid, skey, passTicket) {
        return weChatUrl.RECEIVE_MSG_URL.format(encodeURIComponent(sid), encodeURIComponent(skey), encodeURIComponent(passTicket));
    },
    getContactUrl:function(pass_ticket,skey){
        return weChatUrl.GET_CONTACT_URL.format(encodeURIComponent(pass_ticket),encodeURIComponent(skey),"" + new Date().getTime());
    },
    getBatchContactUrl:function(pass_ticket){
        return weChatUrl.GET_BATCK_CONTACT_URL.format("" + new Date().getTime(), encodeURIComponent(pass_ticket));
    },
    sendMsgUrl : function(pass_ticket){
        return weChatUrl.SEND_MSG_URL.format(encodeURIComponent(pass_ticket));
    },

    /**
     * 消息图片路径
     * @param msgId 消息id
     * @param skey skey
     * @param type 类型。big表情，slave图片
     */
    getMsgPicUrl : function(msgId,skey,type) {
        return weChatUrl.GET_MSG_PIC_URL.format(msgId,encodeURIComponent(skey));
    }
};