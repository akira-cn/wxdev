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