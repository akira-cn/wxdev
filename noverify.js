/**
  TOKEN 校验是保证请求的真实有效，微信自己并不校验TOKEN，
  开发者服务器也可以不校验直接返回echostr，
  但是这样的话意味着第三方也可以很容易伪造请求假装成微信发送给开发者服务器
 */

var PORT = require('./lib/config').wxPort;
var http = require('http');
var qs = require('qs');

var server = http.createServer(function (request, response) {
  var query = require('url').parse(request.url).query;
  var params = qs.parse(query);

  response.end(params.echostr);
});

server.listen(PORT);

console.log("Server runing at port: " + PORT + ".");