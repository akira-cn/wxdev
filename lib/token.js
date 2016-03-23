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