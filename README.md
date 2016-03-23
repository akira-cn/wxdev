# 用Node.js开发微信墙简明教程

https://github.com/akira-cn/wxdev

这是一个简单的用Node.js开发微信墙的教程，在这个教程中，包括以下几部分内容：

- 验证服务器有效性
- 接收用户通过微信订阅号发给服务器的消息
- 解析收到的XML文本消息格式为JSON
- 用模板构造应答用户的XML文本消息
- 将接收到的消息通过WebSocket服务广播
- 获取消息发送人的用户基本信息（名字和头像）

---

微信服务大体上分为两类，一类是消息服务，一类是数据服务。

消息服务是由用户在微信服务号中发送消息，然后微信服务讲消息推送给开发者服务器，因此它是由**微信主动发起，开发者服务器被动接收**的。

![微信主动发起](http://p1.qhimg.com/d/inn/7a148cc4/weixin1.png)

消息服务的数据体格式是XML，微信服务与开发者服务器之间通过约定token保证数据传输的真实和有效性。

```js
//verify.js

var PORT = 9529;
var http = require('http');
var qs = require('qs');

var TOKEN = 'yuntu';

function checkSignature(params, token){
  //1. 将token、timestamp、nonce三个参数进行字典序排序
  //2. 将三个参数字符串拼接成一个字符串进行sha1加密
  //3. 开发者获得加密后的字符串可与signature对比，标识该请求来源于微信

  var key = [token, params.timestamp, params.nonce].sort().join('');
  var sha1 = require('crypto').createHash('sha1');
  sha1.update(key);
  
  return  sha1.digest('hex') == params.signature;
}

var server = http.createServer(function (request, response) {
  
  //解析URL中的query部分，用qs模块(npm install qs)将query解析成json
  var query = require('url').parse(request.url).query;
  var params = qs.parse(query);

  console.log(params);
  console.log("token-->", TOKEN);
  
  if(checkSignature(params, TOKEN)){
    response.end(params.echostr);
  }else{
    response.end('signature fail');
  }
});

server.listen(PORT);

console.log("Server runing at port: " + PORT + ".");
```

事实上，token验证仅用来给开发者服务器验证消息来源确实是微信，而不是伪造的（因为别人不知道具体的token），作为消息发起方的微信并不要求必须验证，也就是说，开发者也可以偷懒不做验证（后果是别人可以模仿微信给服务post请求）。

```js
//noverify.js

/**
  TOKEN 校验是保证请求的真实有效，微信自己并不校验TOKEN，
  开发者服务器也可以不校验直接返回echostr，
  但是这样的话意味着第三方也可以很容易伪造请求假装成微信发送给开发者服务器
 */

var PORT = 9529;
var http = require('http');
var qs = require('qs');

var server = http.createServer(function (request, response) {
  var query = require('url').parse(request.url).query;
  var params = qs.parse(query);

  response.end(params.echostr);
});

server.listen(PORT);

console.log("Server runing at port: " + PORT + ".");
```

将微信服务号的服务器配置为开发服务器的URL，就可以接收到微信服务号的消息了

![](http://p0.qhimg.com/d/inn/da6a7c3e/weixin2.jpg)

**注意：其实理论上一个服务器可以接受和处理多个服务号/订阅号的消息，可以通过消息体的ToUserName来加以区别这个消息是发给哪个微信号的**

```js
//simple_read.js

/**
  这个例子演示从微信服务接收到的消息格式

  从console.log里可以看到，这个消息是一段XML，格式大概是：

  <xml><ToUserName><![CDATA[gh_7fa37bf2b746]]></ToUserName>
  <FromUserName><![CDATA[oZx2jt4po46nfNT7mnBwgu8mGs3M]]></FromUserName>
  <CreateTime>1458697521</CreateTime>
  <MsgType><![CDATA[text]]></MsgType>
  <Content><![CDATA[测试]]></Content>
  <MsgId>6265058147855266278</MsgId>
  </xml>
*/

var PORT = 9529;
var http = require('http');
var qs = require('qs');

var TOKEN = 'yuntu';

function checkSignature(params, token){
  //1. 将token、timestamp、nonce三个参数进行字典序排序
  //2. 将三个参数字符串拼接成一个字符串进行sha1加密
  //3. 开发者获得加密后的字符串可与signature对比，标识该请求来源于微信

  var key = [token, params.timestamp, params.nonce].sort().join('');
  var sha1 = require('crypto').createHash('sha1');
  sha1.update(key);
  
  return  sha1.digest('hex') == params.signature;
}

var server = http.createServer(function (request, response) {

  //解析URL中的query部分，用qs模块(npm install qs)将query解析成json
  var query = require('url').parse(request.url).query;
  var params = qs.parse(query);

  if(!checkSignature(params, TOKEN)){
    //如果签名不对，结束请求并返回
    response.end('signature fail');
    return;
  }

  if(request.method == "GET"){
    //如果请求是GET，返回echostr用于通过服务器有效校验
    response.end(params.echostr);
  }else{
    //否则是微信给开发者服务器的POST请求
    var postdata = "";

    request.addListener("data",function(postchunk){
      postdata += postchunk;
    });

    //获取到了POST数据
    request.addListener("end",function(){
      console.log(postdata);
      response.end('success');
    });
  }
});

server.listen(PORT);

console.log("Server runing at port: " + PORT + ".");
```

接收到的消息大概格式如下：

```xml
<xml><ToUserName><![CDATA[gh_7fa37bf2b746]]></ToUserName>
<FromUserName><![CDATA[oZx2jt4po46nfNT7mnBwgu8mGs3M]]></FromUserName>
<CreateTime>1458697521</CreateTime>
<MsgType><![CDATA[text]]></MsgType>
<Content><![CDATA[测试]]></Content>
<MsgId>6265058147855266278</MsgId>
</xml>
```

由于消息体是一段XML文本，我们可以将它解析成更容易操作的JSON格式数据：

```js
//in parse_message.js

    //获取到了POST数据
    request.addListener("end",function(){
      var parseString = require('xml2js').parseString;

      parseString(postdata, function (err, result) {
        if(!err){
          //我们将XML数据通过xml2js模块(npm install xml2js)解析成json格式
          console.log(result)
          response.end('success');
        }
      });
    });
```

我们可以回复消息给微信服务，它将这个应答消息转给对应的发消息的用户，格式同样是一段XML，我们可以通过简单的模板来生成应答消息：

```js
//in read_reply.js

function replyText(msg, replyText){
  if(msg.xml.MsgType[0] !== 'text'){
    return '';
  }
  console.log(msg);

  //将要返回的消息通过一个简单的tmpl模板（npm install tmpl）返回微信
  var tmpl = require('tmpl');
  var replyTmpl = '<xml>' +
    '<ToUserName><![CDATA[{toUser}]]></ToUserName>' +
    '<FromUserName><![CDATA[{fromUser}]]></FromUserName>' +
    '<CreateTime><![CDATA[{time}]]></CreateTime>' +
    '<MsgType><![CDATA[{type}]]></MsgType>' +
    '<Content><![CDATA[{content}]]></Content>' +
    '</xml>';

  return tmpl(replyTmpl, {
    toUser: msg.xml.FromUserName[0],
    fromUser: msg.xml.ToUserName[0],
    type: 'text',
    time: Date.now(),
    content: replyText
  });
}
```

将这个消息作为response返回，用户就能在服务号里面收到应答的消息了：

```js
    //获取到了POST数据
    request.addListener("end",function(){
      var parseString = require('xml2js').parseString;

      parseString(postdata, function (err, result) {
        if(!err){
          var res = replyText(result, '消息推送成功！');
          response.end(res);
        }
      });
    });
```

![](http://p4.qhimg.com/d/inn/a81d8c6c/weixin3.jpg)

接下来我们创建一个简单的 WebSocket 服务器，它只有一个广播模式：

```js
//in lib/ws.js

/**
  这是一个简单的WebSocket服务
  只提供一个广播的功能，足够微信墙用了
 */

var WS_PORT = 10001;

var WebSocketServer = require('ws').Server
  , wss = new WebSocketServer({ port: WS_PORT });

wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(message) {
    console.log('received: %s', message);
  });

  console.log('new client connected.');
});

wss.broadcast = function broadcast(data) {
  wss.clients.forEach(function each(client) {
    client.send(JSON.stringify(data));
  });
};

module.exports = {
  wss: wss
};

console.log("Socket server runing at port: " + WS_PORT + ".");
```

我们可以将收到的消息用 WebSocket 服务推送：

```js
// in weixin_ws1.js

  parseString(postdata, function (err, result) {
    if(!err){
      if(result.xml.MsgType[0] === 'text'){
        //将消息通过websocket广播
        wss.broadcast(result);
        var res = replyText(result, '消息推送成功！');
        response.end(res);
      }
    }
  });
```

这样我们就可以在页面上接收微信消息了。

不过……

因为消息应答体中并没有发送者的用户信息，比如姓名、性别、头像等等，因此我们需要获取这些信息，这就要用到微信的第二种服务：**数据服务**。

数据服务是由开发者服务器主动调用微信服务API获得信息的服务，包括用户管理、素材管理、智能接口、客服接口等等，这类服务从开发者服务器向微信服务**主动**发起，微信需要验证请求的合法性，采用了与消息服务不同的鉴权机制。

数据服务的请求是https的，返回数据格式通常是JSON。

开发者调用微信数据接口，需要先获取接口调用凭据 access_token。接口调用凭据有效期为2小时，超时或重复获取将导致上次获取的access_token失效。每天每个服务号不能请求超过2000个access_token，因此我们需要自己缓存获取到的access_token。

在这里我们用最简单的文件缓存，如在分布式的和高并发的情况下，我们可以选择其他任意的持久化存储。

```js
// in lib/token.js

/**
    这个模块用来获得有效token
    使用：

    var appID = require('./config').appID,
      appSecret = require('./config').appSecret;

    getToken(appID, appSecret).then(function(token){
      console.log(token);
    });

    http://mp.weixin.qq.com/wiki/14/9f9c82c1af308e3b14ba9b973f99a8ba.html
 */

var request = require('request');
var fs = require('fs');

function getToken(appID, appSecret){
  return new Promise(function(resolve, reject){
    var token;

    //先看是否有token缓存，这里选择用文件缓存，可以用其他的持久存储作为缓存
    if(fs.existsSync('token.dat')){
      token = JSON.parse(fs.readFileSync('token.dat'));
    }

    //如果没有缓存或者过期
    if(!token || token.timeout < Date.now()){
      request('https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid='+appID+'&secret=' + appSecret, function(err, res, data){
        var result = JSON.parse(data);
        result.timeout = Date.now() + 7000000;
        //更新token并缓存
        //因为access_token的有效期是7200秒，每天可以取2000次
        //所以差不多缓存7000秒左右肯定是够了
        fs.writeFileSync('token.dat', JSON.stringify(result));
        resolve(result);
      });      
    }else{
      resolve(token);
    }

  });
}

module.exports = {getToken: getToken};
```

获取到有效的 access_token，就可以进一步获取用户基本信息了：

```
// in lib/user.js

/**
  这个模块用来获得用户基本信息

  使用方法：

  getUserInfo('oZx2jt4po46nfNT7mnBwgu8mGs3M').then(function(data){
    console.log(data);
  });

  http://mp.weixin.qq.com/wiki/1/8a5ce6257f1d3b2afb20f83e72b72ce9.html
 */

var appID = require('./config').appID;
var appSecret = require('./config').appSecret;

var getToken = require('./token').getToken;

var request = require('request');

function getUserInfo(openID){
  return getToken(appID, appSecret).then(function(res){
    var token = res.access_token;

    return new Promise(function(resolve, reject){
      request('https://api.weixin.qq.com/cgi-bin/user/info?access_token='+token+'&openid='+openID+'&lang=zh_CN', function(err, res, data){
          resolve(JSON.parse(data));
        });
    });
  }).catch(function(err){
    console.log(err);
  });  
}

module.exports = {
  getUserInfo: getUserInfo
};
```

这里面就一个注意点，getUserInfo方法的参数用户的openID，实际上就是消息体XML里面的FromUserName

所以我们将用户基本信息获取出来，附加到 WebSocket 推送的消息中：

```
// in weixin_ws2.js

	parseString(postdata, function (err, result) {
		if(!err){
		  if(result.xml.MsgType[0] === 'text'){
		    getUserInfo(result.xml.FromUserName[0])
		    .then(function(userInfo){
		      //获得用户信息，合并到消息中
		      result.user = userInfo;
		      //将消息通过websocket广播
		      wss.broadcast(result);
		      var res = replyText(result, '消息推送成功！');
		      response.end(res);
		    })
		  }
		}
	});
```

最后我们可以得到一段完整的程序，它可以将用户发送给某个微信服务号的文本消息通过 WebSocket 推送到网页，这样我们就实现了一个功能完整的“微信墙”的服务端程序。

以下是完整程序：

```
/**
  上一个例子的微信墙没有获得用户头像、名字等信息
  这些信息要通过另一类微信API，也就是由服务器主动调用微信获得
  这一类API的安全机制不同于之前，不再通过简单的TOKEN校验
  而需要通过appID、appSecret获得access_token，然后再用
  access_token获取相应的数据

  可以先看以下代码：
  lib/config.js - appID和appSecret配置
  lib/token.js  - 获得有效token
  lib/user.js   - 获得用户信息
  lib/reply.js  - 回复微信的模板
  lib/ws.js     - 简单的websocket
*/

var PORT = 9529;

var http = require('http');
var qs = require('qs');
var TOKEN = 'yuntu';

var getUserInfo = require('./lib/user').getUserInfo;
var replyText = require('./lib/reply').replyText; 

var wss = require('./lib/ws.js').wss;

function checkSignature(params, token){
  //1. 将token、timestamp、nonce三个参数进行字典序排序
  //2. 将三个参数字符串拼接成一个字符串进行sha1加密
  //3. 开发者获得加密后的字符串可与signature对比，标识该请求来源于微信

  var key = [token, params.timestamp, params.nonce].sort().join('');
  var sha1 = require('crypto').createHash('sha1');
  sha1.update(key);
  
  return  sha1.digest('hex') == params.signature;
}

var server = http.createServer(function (request, response) {

  //解析URL中的query部分，用qs模块(npm install qs)将query解析成json
  var query = require('url').parse(request.url).query;
  var params = qs.parse(query);

  if(!checkSignature(params, TOKEN)){
    //如果签名不对，结束请求并返回
    response.end('signature fail');
    return;
  }

  if(request.method == "GET"){
    //如果请求是GET，返回echostr用于通过服务器有效校验
    response.end(params.echostr);
  }else{
    //否则是微信给开发者服务器的POST请求
    var postdata = "";

    request.addListener("data",function(postchunk){
        postdata += postchunk;
    });

    //获取到了POST数据
    request.addListener("end",function(){
      var parseString = require('xml2js').parseString;

      parseString(postdata, function (err, result) {
        if(!err){
          if(result.xml.MsgType[0] === 'text'){
            getUserInfo(result.xml.FromUserName[0])
            .then(function(userInfo){
              //获得用户信息，合并到消息中
              result.user = userInfo;
              //将消息通过websocket广播
              wss.broadcast(result);
              var res = replyText(result, '消息推送成功！');
              response.end(res);
            })
          }
        }
      });
    });
  }
});

server.listen(PORT);

console.log("Weixin server runing at port: " + PORT + ".");
```

以上就是微信开发的基本原理，是不是很简单呢？上面讲解的所有的代码在：

https://github.com/akira-cn/wxdev

有兴趣的同学可以注册一个微信订阅号，配置好服务器，自己尝试一下~