/**
  这个例子演示从微信服务接收到的消息格式(XML转成了JSON)

  从console.log里可以看到，这个消息是一段JSON，格式大概是：

  { xml: 
   { ToUserName: [ 'gh_7fa37bf2b746' ],
     FromUserName: [ 'oZx2jt4po46nfNT7mnBwgu8mGs3M' ],
     CreateTime: [ '1458697936' ],
     MsgType: [ 'text' ],
     Content: [ '测试' ],
     MsgId: [ '6265059930266694232' ] } }
*/

var PORT = require('./lib/config').wxPort;
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
      var parseString = require('xml2js').parseString;

      parseString(postdata, function (err, result) {
        if(!err){
          //我们将XML数据通过xml2js模块(npm install xml2js)解析成json格式
          console.log(result)
          response.end('success');
        }
      });
    });
  }
});

server.listen(PORT);

console.log("Server runing at port: " + PORT + ".");