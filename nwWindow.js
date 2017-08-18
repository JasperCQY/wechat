/**
 * window设置
 */
// gui
var gui = require('nw.gui');
// window
var nwWindow = gui.Window.get();

nwWindow.setTray = function(){
    // 托盘
    var tray = new gui.Tray({ title: 'cqy的微信',tooltip:"cqy的微信", icon: '/resources/logo.png' });
    // 托盘菜单
    var menu = new gui.Menu();

    var menuItem = new gui.MenuItem({ type: 'normal', label: '退出',click:function(){
        nwWindow.close();
    } });
    menu.append(menuItem);

    menuItem = new gui.MenuItem({ type: 'normal', label: '关于', click:function () {
        var url = "/index.html";

        var docWindowOptions = {
            // "new-instance": true,
            "show_in_taskbar":true,
            //"toolbar":false,
            "show": true
        };
        require('nw.gui').Window.open(url,docWindowOptions)
    } });
    menu.append(menuItem);
    tray.menu = menu;

    //click事件
    tray.on('click', function() {
        if(nwWindow.isVisable) {
            nwWindow.hide();
            nwWindow.isVisable = false;
        } else {
            nwWindow.show();
            nwWindow.isVisable = true;
        }
    });
};
nwWindow.setTray();

nwWindow.addTrayNotification = function (opts) {
    var options = {};
    if(opts.icon) {
        options.icon = opts.icon;
    }
    if(opts.body) {
        options.body = opts.body;
    }
    var title = opts.title ? opts.title : "";
    var notification = new Notification(title,options);

    notification.onclick = function () {
        nwWindow.show();
        notification.close();
    };
    if(opts.onclick) {
        notification.onclick = opts.onclick;
    } else if(opts.onClick) {
            notification.onclick = opts.onClick;
    }
    notification.onshow = function () {
        // play sound on show
        // myAud=document.getElementById("audio1");
        // myAud.play();

        // auto close after 1 second
        setTimeout(function() {notification.close();}, 3000);
    };
    if(opts.onshow) {
        notification.onshow = opts.onshow;
    } else if(opts.onShow) {
        notification.onshow = opts.onShow;
    }
};

nwWindow.on("focus",function(){
    nwWindow.isFocus = true;
});
nwWindow.on("blur",function(){
    nwWindow.isFocus = false;
});