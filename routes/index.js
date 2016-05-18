var express = require('express');
var router = express.Router();
var nano = require('nano');
var db = nano(process.env.COUCH_URL + '/' + process.env.IMAGE_DB);
var request = require('request');
var temp = require('temp');
var AWS = require('aws-sdk')
var s3 = new AWS.S3();
var s3bucket = "hamster-images";
var path = require('path');
var fs = require('fs');
var mime = require('mime');
var s3host = "http://s3-us-west-2.amazonaws.com/";

function idToUrl(id) {
  var buffer = new Buffer(id, 'base64');
  return buffer.toString();
}

function urlToId(url) {
  var buffer = new Buffer(url);
  return buffer.toString('base64');
}

function imageName(id, size, extname) {
  return [id, size].join('-') + extname;
}

function imageFolder(id, size) {
  return id.match(/.{1,4}/).join('/');
}

function imagePath(id, size, extname) {
  return [imageFolder(id, size), imageName(id, size, extname)].join('/');
}

function imageUrl(id, size, extname) {
  return s3host + s3bucket + '/' + imagePath(id, size, extname)
}

function getImage(id, callback) {
  db.get(id, function(error, document) {
    if (error) {
      document = {
        _id: id,
        original: idToUrl(id)
      };
    }
    callback(error, document);
  });
}

function downloadImage(url, callback) {
  temp.open({suffix: path.extname(url)}, function(error, info) {
    if (error) {
      callback(error);
    }
    var stream = fs.createWriteStream(info.path);
    stream.on('finish', function() {
      callback(null, info);
    });
    stream.on('error', function(error) {
      callback(error);
    });
    request({url: url}).on('error', function(error) {
      callback(error);
    }).pipe(stream);
  });
}

function uploadImage(id, size, stream, callback) {
  var data = {
    Bucket: s3bucket,
    Key: id + "-" + size,
    Body: fs.createReadStream(stream.path),
    ContentType: mime.lookup(stream.path)
  };
  s3.putObject(data, function(error, s3url) {
    callback(error, s3url);
  });
}

function resizeImage(stream, size, callback) {
  temp.open({suffix: path.extname(stream.path)}, function(error, info) {
    var magick = imageMagick(stream.path);
    if (size) {
      magick = magick.resize(size, size)
    }
    magick
        .autoOrient()
        .write(info.path, function(error) {
          if (error) {
            return callback(error, info);
          }
          callback(null, info);
        });
  });
}

function getImageUrl(id, size, callback) {
  getImage(id, function(error, image) {
    var url = image["" + size];
    if (url) {
      return callback(null, url);
    }
    downloadImage(image.original, function(error, download) {
      if (error) {
        return callback(error);
      }
      resizeImage(download, size, function(error, resize) {
        if (error) {
          return callback(error);
        }
        uploadImage(id, size, resize, function(error, s3url) {
          if (error) {
            return callback(error);
          }
          callback(null, s3url);
        });
      });
    });
  });
}

/* GET users listing. */
router.get('/img/:id', function(req, res) {
  var type = req.param('type'),
      id = req.param('id'),
      size = type ? SIZES[type] : req.param('size');

  getImageUrl(id, size, function(error, url) {
    if (error) {
      res.status(404).end();
    } else {
      res.redirect(url);
    }
  });
});

module.exports = router;
