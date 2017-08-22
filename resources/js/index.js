function HTMLDecode(text) {
    var temp = document.createElement("div");
    temp.innerHTML = text;
    var output = temp.innerText || temp.textContent;
    temp = null;
    return output;
}
var index = {
    // key NickName
    // value User
    NickNameMap : {},
    init: function () {

        // 窗口关闭事件
        $("#winHead .winClose").click(index.winCloseEvent);

        // 隐藏联系人提示框
        $("#tip-contacts").hide();
        // 隐藏聊天面板
        $("#winContent-c").hide();
        // 清空最近联系人
        $("#c-left").html("");
        // 清空聊天记录
        $("#c-content").html("");
        if (window.wechat.login.requestUuid()) {
            // 显示二维码
            $("#winContent").append("<img id='qrCode' src='" + weChatUrl.qrCodeUrl(WeChatConfig.uuid) + "'></img>");

            window.wechat.login.loopConfirmLogin(WeChatConfig.uuid, index.setHeadImg, index.loginSuccess);
        }
    },
    setHeadImg: function (imgData) {
        console.log(imgData);
        $("#qrCode").remove();
        $("#winContent").append("<img id='qrCode' style='position: absolute' src='" + imgData + "' height='132' width='132'></img>");
        var left = ($("#winContent").width() - $("#qrCode").width()) / 2;
        var top = ($("#winContent").height() - $("#qrCode").height()) / 2;
        $("#qrCode").css("left", left);
        $("#qrCode").css("top", top);
    },
    loginSuccess: function (config) {
        if(config == null) {
            // 二维码已经失效
            index.winReload();
        }
        console.log(config);
        if (!config.passTicket) {
            return;
        }
        // 登录成功。设置头像
        $("#headImg").attr("src", $("#qrCode").attr("src"));
        $("#qrCode").remove();

        // 设置姓名,订阅，联系群
        var initData = window.wechat.login.wxInit(config.passTicket);
        $("#c-head #name").html(initData.User.NickName);

        // 显示聊天页面
        $("#winContent-c").show();

        // 获取联系人
        window.wechat.login.getContact(WeChatConfig.passTicket,WeChatConfig.skey);
        // 显示通讯录
        var user = null;
        for(var userName in WeChatConfig.BatchContactMap) {
            user = WeChatConfig.BatchContactMap[userName];
            index.NickNameMap[user.NickName] = user;
            $("#c-left2").append("<div style='padding-left: 2px;' onclick=\"index.addContactEvent('" + userName + "')\"><img src='"+WeChatConfig.host+user.HeadImgUrl+"' width='16px' height='16px'>" + (user.RemarkName ? user.RemarkName : user.NickName) + "</div>");
        }
        for(var userName in WeChatConfig.ContactMap) {
            user = WeChatConfig.ContactMap[userName];
            index.NickNameMap[user.NickName] = user;
            $("#c-left2").append("<div style='padding-left: 2px;' onclick=\"index.addContactEvent('" + userName + "')\"><img src='"+WeChatConfig.host+user.HeadImgUrl+"' width='16px' height='16px'>" + (user.RemarkName ? user.RemarkName : user.NickName) + "</div>");
        }

        // 开始同步
        window.wechat.massage.heartbeat(index.receiveMsg, index.errorEvent);

        // 发送消息事件
        $("#c-input #sendButton").click(function(){
            var msg = $("#c-input textarea").val();
            $("#c-input textarea").val("");
            index.sendMsg(msg);
        });
        $("#c-input textarea").keypress(function(event){
            if(event.ctrlKey == true && event.keyCode == 10) {
                var msg = $("#c-input textarea").val();
                $("#c-input textarea").val("");
                index.sendMsg(msg);
            }
        });
    },
    sendMsg : function (msg) {
        var userName = $("#c-content").attr("class");
        if(!userName || userName == "" || !msg) {
            return;
        }
        var user = WeChatConfig.getContact(userName);
        var uuid = window.wechat.uuid();
        var wxMsg = {
            Type : 1,
            Content : msg,
            FromUserName : WeChatConfig.user.UserName,
            ToUserName : user.UserName,
            LocalID : uuid,
            ClientMsgId : uuid
        };
        window.wechat.massage.sendMsg(wxMsg,index.sendSuccess);
        // 移到最上面
        var userNameDiv = $("#"+userName);
        userNameDiv.remove();
        userNameDiv.prependTo("#c-left");
    },
    sendSuccess : function (msg) {
        var userName = $("#c-content").attr("class");
        var user = WeChatConfig.getContact(userName);
        msg.MsgType = msg.Type;
        msg.CreateTime = new Date().getTime()/1000;

        // 存储消息
        if(!WeChatConfig.ContactMsgMap[userName]) {
            WeChatConfig.ContactMsgMap[userName] = [];
        }
        WeChatConfig.ContactMsgMap[userName].push(msg);
        index.appendMsg(user,msg);
    },
    /**
     * msgItem.FromUserName
     * msgItem.ToUserName
     * msgItem.MsgId
     * msgItem.MsgType
     * msgItem.Content
     * msgItem.CreateTime
     * @param msg
     */
    receiveMsg: function (msg) {
        // 接收消息
        console.log(msg);
        // 别人发送的消息
        var userName = msg.FromUserName;
        if(WeChatConfig.user.UserName == msg.FromUserName) {
            // 自己通过别的客户端发送的消息
            userName = msg.ToUserName;
        }

        if(userName.charAt(1) == '@') {
            // 群消息
            userName = userName.replace(/@/ig, "g");
        } else {
            // 联系人消息
            userName = userName.replace(/@/ig,"a");
        }
        var user = WeChatConfig.getContact(userName);
        if(user == null) {
            // 消息有问题
            console.warn(msg);
            return;
        }

        if(!WeChatConfig.ContactMsgMap[userName]) {
            WeChatConfig.ContactMsgMap[userName] = [];
        }
        WeChatConfig.ContactMsgMap[userName].push(msg);

        // 左侧没有对应的联系人
        index.addContact(userName,user);

        // 新消息提示。MsgType=51手机app查看聊天页面
        var userNameDiv = $("#"+userName);
        if(!userNameDiv.hasClass("l-focus") && msg.MsgType != 51) {
            userNameDiv.find(".new").show();
        }

        // 往消息区添加消息
        index.specialMsg(user,msg);
        if($("#c-content").hasClass(userName)){
            index.appendMsg(user,msg);

            // 移到最上面
            userNameDiv.remove();
            userNameDiv.prependTo("#c-left");
        }

        if(!nwWindow.isFocus && msg.MsgType != 51 && msg.Content) {
            nwWindow.addTrayNotification({
                title : "消息提醒",
                icon : WeChatConfig.host+user.HeadImgUrl,
                body : msg.Content,
                onclick : function () {
                    nwWindow.close();
                }
            });
        }
    },
    specialMsg : function(user,msg){
        var content = msg.Content;
        if("淘宝天猫优惠券820群" == user.NickName) {
            if (msg.MsgType == 1) {
                userTemp = index.NickNameMap["惠多多领券商城"];
                var ii = content.indexOf("<br/>");
                if(ii != -1 && ii + 5 < content.length) {
                    content = content.substring(ii + 5, content.length);
                }
                if("找" == content.charAt(0)) {
                    var wxMsg = {
                        Type : 1,
                        Content : content,
                        FromUserName : WeChatConfig.user.UserName,
                        ToUserName : userTemp.UserName,
                        LocalID : uuid,
                        ClientMsgId : uuid
                    };
                    window.wechat.massage.sendMsg(wxMsg,index.sendSuccess);
                }
            }
        } else if("惠多多领券商城" == user.NickName) {
            var userTemp = index.NickNameMap["淘宝天猫优惠券820群"];
            var uuid = window.wechat.uuid();
            if(msg.MsgType == 49) {
                content = HTMLDecode(msg.Content);
                var domParser = new  DOMParser();
                var xmlDoc = domParser.parseFromString(content, 'text/xml');
                var root = xmlDoc.children[0];
                content = "";
                // title
                var title = root.getElementsByTagName("title")[0].textContent;
                var url = root.getElementsByTagName("url")[0].textContent;
                var imgUrl = root.getElementsByTagName("topnew")[0].getElementsByTagName("cover")[0].textContent;
                content += title+"\n"+url+"\n";
                var node = null;
                for(var xIndex in root.children) {
                    node = root.children[xIndex];
                    if("item" != node.tagName) {
                        continue;
                    }
                    title = node.getElementsByTagName("title")[0].textContent;
                    url = node.getElementsByTagName("url")[0].textContent;
                    imgUrl = node.getElementsByTagName("cover")[0].textContent;
                    content += title+"\n"+url+"\n";
                }
                var wxMsg = {
                    Type : 1,
                    Content : content,
                    FromUserName : WeChatConfig.user.UserName,
                    ToUserName : userTemp.UserName,
                    LocalID : uuid,
                    ClientMsgId : uuid
                };
                window.wechat.massage.sendMsg(wxMsg,index.sendSuccess);
            }
        }
    },
    /**
     *
     * @param user 发送消息者
     * @param msg 发送的消息
     */
    appendMsg : function(user,msg){
        var isSelf = true;
        var nickName = null;
        var content = msg.Content;
        if(msg.FromUserName == user.UserName) {
            var sendMsgUser = user; // 发送消息者
            isSelf = false;
            if(msg.FromUserName.charAt(0) != '@' || (msg.FromUserName.charAt(0) == '@' && msg.FromUserName.charAt(1) == '@')) {
                // 群消息
                var msgSp = ":<br/>";
                var iUser = msg.Content.indexOf(msgSp);
                if(iUser == -1) {
                    // 异常
                    console.error(msg);
                    return;
                } else {
                    sendMsgUser = sendMsgUser.MemberMap[msg.Content.substring(0,iUser).trim()];
                    if(sendMsgUser == null) {
                        // 异常
                        console.error(msg.Content.substring(0,iUser).trim());
                        console.error(sendMsgUser.MemberMap);
                        return;
                    }
                    content = msg.Content.substring(iUser+msgSp.length, msg.Content.length).trim()
                }
            }
            nickName=(sendMsgUser.RemarkName ? sendMsgUser.RemarkName : sendMsgUser.NickName);

        } else {
            isSelf = true;
            nickName = WeChatConfig.user.NickName;
        }
        // 文本消息
        if(msg.MsgType == 1) {
            index.appendMsgPrivate(isSelf,nickName,msg.CreateTime,content.replace(/\n/ig,"<br/>").replace(/ /ig, "&nbsp;"));
        } else if(msg.MsgType == 10000) {
            // 红包
            index.appendMsgPrivate(true, "系统消息", msg.CreateTime, "<span style='color: burlywood;margin-left:70px;'>有红包，请在手机上查看</span>");
        } else if(msg.MsgType == 47) {
            // 表情。最大200x200
            var maxLen = 100;
            var max = Math.max(msg.ImgHeight, msg.ImgWidth);
            var height = msg.ImgHeight == max ? maxLen : msg.ImgHeight * maxLen / msg.ImgWidth;
            var width = msg.ImgWidth == max ? maxLen : msg.ImgWidth * maxLen / msg.ImgHeight;
            content = "<img src='" + weChatUrl.getMsgPicUrl(msg.MsgId, WeChatConfig.skey) + "' width='" + width + "' height='" + height + "'/>";
            index.appendMsgPrivate(isSelf, nickName, msg.CreateTime, content);
        } else if(msg.MsgType == 3) {
            // 图片。最大200x200
            var maxLen = 100;
            var max = Math.max(msg.ImgHeight, msg.ImgWidth);
            var height = msg.ImgHeight == max ? maxLen : msg.ImgHeight * maxLen / msg.ImgWidth;
            var width = msg.ImgWidth == max ? maxLen : msg.ImgWidth * maxLen / msg.ImgHeight;
            content = "<img src='" + weChatUrl.getMsgPicUrl(msg.MsgId, WeChatConfig.skey) + "' width='" + width + "' height='" + height + "'/>";
            index.appendMsgPrivate(isSelf, nickName, msg.CreateTime, content);
        } else if(msg.MsgType == 49) {
            var content = HTMLDecode(msg.Content);
            var domParser = new  DOMParser();
            var xmlDoc = domParser.parseFromString(content, 'text/xml');
            var root = xmlDoc.children[0];

            content = "";
            // title
            var title = root.getElementsByTagName("title")[0].textContent;
            var url = root.getElementsByTagName("url")[0].textContent;
            var imgUrl = root.getElementsByTagName("topnew")[0].getElementsByTagName("cover")[0].textContent;
            content += title+"<br/>"+url+"<br/>";
            var node = null;
            for(var xIndex in root.children) {
                node = root.children[xIndex];
                if("item" != node.tagName) {
                    continue;
                }
                title = node.getElementsByTagName("title")[0].textContent;
                url = node.getElementsByTagName("url")[0].textContent;
                imgUrl = node.getElementsByTagName("cover")[0].textContent;
                content += title+"<br/>"+url+"<br/>";
            }
            index.appendMsgPrivate(isSelf, nickName, msg.CreateTime, content);
        }
    },
    /**
     *
     * @param isSelf   是否是当前用户发送
     * @param nickName 发送人昵称
     * @param time  发送时间
     * @param content 发送内容
     */
    appendMsgPrivate : function(isSelf,nickName,time,content){
        var msgDiv = $("#c-c-msg").clone();
        if(isSelf == true) {
            msgDiv.find(".c-c-head").addClass("green");
        } else {
            msgDiv.find(".c-c-head").addClass("blue");
        }
        msgDiv.find(".c-c-head").addClass("blue");
        msgDiv.removeAttr("id");
        msgDiv.find(".c-c-nickname").html(nickName);
        msgDiv.find(".c-c-time").html(new Date(time*1000).Format("yyyy/MM/dd hh:mm:ss"));
        msgDiv.find(".c-c-content").html(content);
        msgDiv.appendTo("#c-content");
        // 滚动到底
        var c_content = $("#c-content");
        c_content.scrollTop(c_content[0].scrollHeight - c_content.height());
    },
    changeContact : function (th) {
        var contact = $(th);
        var focuses = contact.parent().find(".l-focus");
        focuses.removeClass("l-focus");
        // 当前聊天人背景色
        contact.addClass("l-focus");
        // 去除新消息提示
        contact.find(".new").hide();

        // 消息面板显示消息
        var userName = contact.attr("id");
        $("#c-content").attr("class","");
        $("#c-content").addClass(userName);
        $("#c-content").html("");
        var msgs = WeChatConfig.ContactMsgMap[userName];
        var user = WeChatConfig.getContact(userName);
        if(msgs) {
            for (var i = 0; i < msgs.length; i++) {
                index.appendMsg(user, msgs[i]);
            }
        }
    },
    contactFocus : function () {
    },
    contactBlur : function () {
    },
    contactInputBlur : function () {
        $("#tip-contacts").hide("slow");
    },
    contactKeyPress : function () {
        var key = $("#input-contact").val();
        if(!key) {
            return;
        }
        var user = null;
        var isRight = false;
        $("#tip-contacts").hide();
        $("#tip-contacts").html("");
        // var count = 0;
        for(var userName in WeChatConfig.ContactMap) {
            user = WeChatConfig.ContactMap[userName];
            isRight = (user.NickName && user.NickName.indexOf(key) != -1);
            isRight = isRight || (user.PYInitial && user.PYInitial.indexOf(key) != -1);
            isRight = isRight || (user.PYQuanPin && user.PYQuanPin.indexOf(key) != -1);
            isRight = isRight || (user.RemarkName && user.RemarkName.indexOf(key) != -1);
            isRight = isRight || (user.RemarkPYInitial && user.RemarkPYInitial.indexOf(key) != -1);
            isRight = isRight || (user.RemarkPYQuanPin && user.RemarkPYQuanPin.indexOf(key) != -1);
            if(isRight == true) {
                $("#tip-contacts").append("<div onclick=\"index.addContactEvent('"+userName+"')\">"+(user.RemarkName ? user.RemarkName:user.NickName)+"</div>");
                // count++;
            }
            // if(count >= 20) {
            //     break;
            // }
        }
        for(var userName in WeChatConfig.BatchContactMap) {
            user = WeChatConfig.BatchContactMap[userName];
            isRight = (user.NickName && user.NickName.indexOf(key) != -1);
            isRight = isRight || (user.PYInitial && user.PYInitial.indexOf(key) != -1);
            isRight = isRight || (user.PYQuanPin && user.PYQuanPin.indexOf(key) != -1);
            isRight = isRight || (user.RemarkName && user.RemarkName.indexOf(key) != -1);
            isRight = isRight || (user.RemarkPYInitial && user.RemarkPYInitial.indexOf(key) != -1);
            isRight = isRight || (user.RemarkPYQuanPin && user.RemarkPYQuanPin.indexOf(key) != -1);
            if(isRight == true) {
                $("#tip-contacts").append("<div onclick=\"index.addContactEvent('"+userName+"')\">"+(user.RemarkName ? user.RemarkName:user.NickName)+"</div>");
                // count++;
            }
            // if(count >= 20) {
            //     break;
            // }
        }

        $("#tip-contacts").show("normal");
    },
    /**
     * 左侧添加联系人
     * @param userName 联系人的userName(其中@用a替换)
     * @param user 联系人对象。可以省略
     */
    addContact : function (userName, user) {
        if(!user){
            user = WeChatConfig.getContact(userName);
        }
        var contactItem = $("#c-left").find("."+userName);
        if((!contactItem) || contactItem.length == 0) {
            // 添加
            var linkman = $("#linkman").clone();
            linkman.attr("id",userName);
            linkman.addClass(userName);
            if(user.HeadImgUrl){
                linkman.find(".linkman-head").attr("src",WeChatConfig.host+user.HeadImgUrl);
            }
            var nickName = (user.RemarkName ? user.RemarkName : user.NickName);
            linkman.find(".linkman-name").html(nickName);
            linkman.find(".linkman-name").attr("title",nickName);
            if(user.Signature) {
                linkman.find(".linkman-con").html(user.Signature);
                linkman.find(".linkman-con").attr("title",user.Signature);
            }

            // 左侧没有联系人
            if($("#c-left").html().trim() == "") {
                $("#c-content").attr("class","");
                $("#c-content").addClass(userName);
                linkman.addClass("l-focus");
            }
            linkman.appendTo("#c-left");
        }
    },
    addContactEvent : function (userName) {
        index.addContact(userName);
        var userNameDiv = $("#"+userName);
        // 移到最上面
        userNameDiv.remove();
        userNameDiv.prependTo("#c-left");
        index.switchLeftEvent(0);
        userNameDiv.click();
    },
    switchLeftEvent : function (type) {
        $("#bottom"+type).parent().find("div").removeClass("active");
        $("#bottom"+type).addClass("active");
        if(type == 0) {
            // 最近联系人
            $("#c-left2").hide();
            $("#c-left").show();
        } else if(type == 1) {
            // 通讯录
            $("#c-left").hide();
            $("#c-left2").show();
        }
    },
    errorEvent : function(synccheck) {
        if(synccheck.retcode == 1101) {
            // 退出
            index.winReload();
        }
    },
    winReload : function(){
        // 重新加载
        nwWindow.reload();
    },
    winCloseEvent: function () {
        // 关闭窗口
        nwWindow.close();
    }
};
$(document).ready(function () {
    index.init();
});