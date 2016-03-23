/**
  这个例子演示微信服务验证服务器地址有效性

  事实上微信服务分两部分API，
  第一部分是由微信调用开发者服务器，推送数据给开发者服务器
  数据格式是XML，双方通过约定TOKEN的方式来保证请求有效

  http://mp.weixin.qq.com/wiki/8/f9a0b8382e0b77d87b3bcc1ce6fbc104.html
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