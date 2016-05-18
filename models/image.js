var gm = require('gm'),
    Temp = require('temp'),
    request = require('request'),
    Mime = require('mime'),
    AWS = require('aws-sdk'),
    imageMagick = gm.subClass({ imageMagick: true });

function Image(url, bucket) {
  this.url = url;
  this.bucket = bucket;
  this.id = Image.encode(url);
}

Image.get = function(id, bucket, callback) {
  var url = Image.decode(id);
  db.get(id, function(error, document) {
    var image;
    // TODO
    if (error) {
      image = new Image(url, bucket);
    } else {

    }

    callback(error, document);
  });
}

Image.prototype.s3url = function(callback) {
  Image.s3url(this.url, callback);
}

// Decodes an url to an id.
// @return String
Image.encode = function(url) {
  var buffer = new Buffer(url);
  return buffer.toString('base64');
}

// Decodes an id to an url.
// @return String
Image.decode = function(id) {
  var buffer = new Buffer(id, 'base64');
  return buffer.toString();
}

Image.download = function(url, callback) {
  var suffix = path.extname(path);
  Temp.open({suffix: path.extname(url)}, function(error, info) {
    if (error) {
      callback(error);
    }

    request({url: url}, function(error) {
      callback(error, info.path);
    }).pipe(fs.createWriteStream(info.path));
  });
}

Image.s3key = function(url) {
  var id = Image.encode(url);
  return id.match(/.{1,4}/).join('/') + Path.extname(url);
}

Image.s3params = function(bucket, source) {
  var id = Image.encode(url),
      params = {};

  params.Bucket = bucket;
  params.Key = Image.s3Key(source);
  params.ContentType = Mime.lookup(source);
  return params;
}

Image.s3url = function(source, bucket, callback) {
  var params = Image.s3params(bucket, source);
  s3.getSignedUrl('getObject', params, function(error, url) {
    callback(error, url);
  });
}

Image.s3upload = function(source, bucket, callback) {
  var params = Image.s3params(bucket, source);
  params.Body = fs.createReadStream(source);

  s3.getSignedUrl('putObject', params, function(error, url) {
    callback(error, url);
  });
}

Image.resize = function(path, callback) {
  var suffix = path.extname(path),
      processor = imageMagick(path);

  Temp.open({suffix: suffix}, function(error, info) {
    if (size) {
      processor = processor.resize(size, size)
    }

    processor
        .autoOrient()
        .write(info.path, function(error) {
          callback(error, info.path);
        });
  });
}

export default Image;