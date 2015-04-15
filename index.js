var util    = require('util');
var twitter = require('twitter');
var maps    = require('googlemaps');
var request = require('request-json');
var fs = require('fs');

var config = {}

try {
  fs.statSync("./config.json");
  config = require('./config.json');
} catch (e) {
  console.log("no config.json");
}

var account = "@"+ (process.env.account || config.account);

var client = new twitter({
    consumer_key:         process.env.consumer_key        || config.consumer.key,
    consumer_secret:      process.env.consumer_secret     || config.consumer.secret,
    access_token_key:     process.env.access_token_key    || config.access_token.key,
    access_token_secret:  process.env.access_token_secret || config.access_token.secret
});

var weather = request.createClient('http://api.openweathermap.org/');

function icon_url(id) {
  return "http://openweathermap.org/img/w/"+id+".png"
}

// stream.on ->
//    replyTrigger(tweet:obj) ->
//       location(post:obj) ->
//          getWeather(post:obj) ->
//             update(post:obj)

// post : {
//   "user" : "@~~~",
//   "id"   : "~~~", # in_reply_to_status_id
//   "text" : "東京",
//   "loc"  : {
//     "lat" : "35.681382",
//     "lng" : "139.766084"
//   },
//   "reply" : "scattered clouds http://openweathermap.org/img/w/03n.png"
// }


function replyTrigger(tweet) {
  if (tweet.text.indexOf(account) != -1) {
  //if (tweet.text.indexOf("@") != -1) {
    var text = tweet.text.replace(account, "");
    //var text = tweet.text.replace("@", "");
    text = text.replace(" ", "").replace("　", "");
    console.log(tweet);
    var post = {
      "user" : "@"+tweet.user.screen_name,
      "id"   : tweet.id,
      "text" : text,
      "reply" : ""
    };

    location(post);

  }
}



function location(post) {
  var _post = post;
  maps.geocode(post.text, function(err, data) {
    console.log(data);
    if(data.status == "OK") {
      _post.loc = {};
      _post.loc = data.results[0].geometry.location;
      getWeather(_post);
    } else {
      _post.text = "";
      _post.reply = "Err";
      update(_post);
    }
  });
}

function getWeather(post) {
  var _post = post;
  weather.get("data/2.5/weather?lat="+_post.loc.lat+"&lon="+_post.loc.lng, function(err, res, body) {
    console.log(body);
    if(body.cod==200){
        var desc = body.weather[0].description;
        var icon = body.weather[0].icon;
        _post.reply = desc + " " + icon_url(icon);

        update(_post);
    }
  });
}

function update(post) {
  var _post = post;
  var str = _post.user + " " + _post.text + " " + _post.reply;
  var status = {
    "status": str,
    "in_reply_to_status_id": _post.id
  };
  if(_post.loc) {
      status.lat  = _post.loc.lat;
      status.long = _post.loc.lng;
      status.status += " " + "http://maps.google.com/maps?q="+_post.loc.lat+","+_post.loc.lng;
  }
  console.log(status);
  client.post('statuses/update', status, function(err, tweet, res) {
    if (!err) {
      console.log(tweet);
    }
  });
}

client.stream('user', function(stream) {

//client.stream('statuses/sample', function(stream) {
  stream.on('data', function(tweet) {
    if(tweet.text) {
      replyTrigger(tweet);
      //console.log(tweet);
    }
  });
});

// replyTrigger({
//   "text": "@weather_reply 東京",
//   "id"  : "587934109785141248",
//   "user": {
//     "screen_name": "toihrk"
//   }
// });
