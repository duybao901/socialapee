"use strict";

var _require = require('../util/admin'),
    db = _require.db; // TODO: fetch all scream


module.exports.getAllScreams = function (req, res) {
  db.collection('screams').get().then(function (data) {
    var screams = [];
    data.forEach(function (doc) {
      screams.push({
        screams: doc.id,
        body: doc.data().body,
        userHandle: doc.data().userHandle,
        createdAt: doc.data().createdAt,
        likeCount: doc.data().likeCount,
        commentCount: doc.data().commentCount,
        userImage: doc.data().userImage
      });
    });
    return res.json(screams);
  })["catch"](function (err) {
    console.log(err);
  });
}; // TODO: Post a scream


module.exports.postOneScream = function (req, res) {
  if (req.method !== "POST") {
    return res.status(400).json({
      err: "Method not alow"
    });
  }

  var newScreams = {
    body: req.body.body,
    userHandle: req.user.handle,
    userImage: req.user.imageUrl,
    likeCount: 0,
    commentCount: 0,
    createdAt: new Date().toISOString()
  };
  db.collection('screams').add(newScreams).then(function (doc) {
    var resScream = newScreams;
    resScream.screamId = doc.id;
    res.json(resScream);
  })["catch"](function (err) {
    return res.status(400).json({
      err: "something error "
    });
  });
}; // TODO: fetch a scream 


module.exports.getScream = function (req, res) {
  var screamData = {};
  db.doc("/screams/".concat(req.params.screamId)).get().then(function (doc) {
    if (!doc.exists) {
      res.status(404).json({
        err: "scream not found"
      });
    }

    screamData = doc.data();
    console.log(doc.data()); // doc.id -> scream id

    screamData.screamId = doc.id;
    return db.collection('comments').orderBy('createdAt', 'desc') //Muốn sủ dụng hàm này thì cần phải tạo index
    .where("screamId", "==", req.params.screamId).get();
  }).then(function (data) {
    screamData.comments = [];
    data.forEach(function (doc) {
      screamData.comments.push(doc.data());
    });
    return db.collection('likes').where("screamId", "==", req.params.screamId).get();
  }).then(function (data) {
    screamData.likes = [];
    data.forEach(function (doc) {
      screamData.likes.push(doc.data());
    });
    res.json(screamData);
  })["catch"](function (err) {
    console.error(err);
    res.status(500).json({
      err: err.code
    });
  });
}; // TODO: Post a comments


module.exports.commentOnScream = function (req, res) {
  // Validate body
  if (req.body.body.trim() === '') return res.status(404).json({
    comment: 'comment not empty'
  });
  var newComment = {
    body: req.body.body,
    createdAt: new Date().toISOString(),
    userHandler: req.user.handle,
    userImage: req.user.imageUrl,
    screamId: req.params.screamId
  };
  db.doc("/screams/".concat(req.params.screamId)).get().then(function (doc) {
    if (!doc.exists) {
      return res.status(500).json({
        err: 'Screams Not found'
      });
    } // ref la doccument hiện tại


    return doc.ref.update({
      commentCount: doc.data().commentCount + 1
    });
  }).then(function () {
    return db.collection('comments').add(newComment);
  }).then(function () {
    res.json('Add comment successfully');
  })["catch"](function (err) {
    console.error(err);
    res.status(500).json({
      err: err.code
    });
  });
}; // TODO: Delete a scream


module.exports.deleteScream = function (req, res) {
  var screamDocument = db.doc("/screams/".concat(req.params.screamId)).get();
  screamDocument.then(function (doc) {
    if (!doc.exists) {
      return res.status(403).json({
        Error: 'Scream not found'
      });
    }

    if (doc.data().userHandle !== req.user.handle) {
      return res.status(403).json({
        Error: 'Can not delete scream'
      });
    }

    return db.doc("/screams/".concat(req.params.screamId))["delete"]();
  }).then(function () {
    res.json({
      message: 'delete scream successfully'
    });
  })["catch"](function (error) {
    console.error(error);
    res.status(500).json({
      err: error.code
    });
  });
}; // TODO: Like a scream


module.exports.likeScream = function (req, res) {
  var likeDocument = db.collection('likes').where('userHandle', '==', req.user.handle).where('screamId', '==', req.params.screamId).limit(1);
  var screamDocument = db.doc("/screams/".concat(req.params.screamId));
  var screamData;
  screamDocument.get().then(function (doc) {
    console.log('Like Doc:', doc);

    if (doc.exists) {
      screamData = doc.data();
      screamData.screamId = doc.id;
      return likeDocument.get();
    } else {
      res.status(500).json({
        err: 'scream not found'
      });
    }
  }).then(function (data) {
    console.log('Like Data: ', data); // Nếu có data thì đã like rồi

    if (data.empty) {
      return db.collection('likes').add({
        screamId: req.params.screamId,
        userHandle: req.user.handle
      }).then(function () {
        screamData.likeCount++;
        return screamDocument.update({
          likeCount: screamData.likeCount
        });
      }).then(function () {
        res.json({
          message: "".concat(req.user.handle, " Like a scream ").concat(req.params.screamId, " succesfully")
        });
      })["catch"](function (err) {
        console.log(err);
        res.status(500).json({
          err: err.code
        });
      });
    } else {
      return res.status(500).json({
        error: 'Scream already liked'
      });
    }
  })["catch"](function (err) {
    console.log('err:', err);
    res.status(500).json({
      error: err.code
    });
  });
}; // TODO: Unlike a scream


module.exports.unlikeScream = function (req, res) {
  var likeDocument = db.collection('likes').where('userHandle', '==', req.user.handle).where('screamId', '==', req.params.screamId);
  var screamDocument = db.doc("/screams/".concat(req.params.screamId));
  var screamData = {};
  screamDocument.get().then(function (doc) {
    console.log('Unlike Doc:', doc);

    if (doc.exists) {
      screamData = doc.data();
      screamData.screamId = doc.id;
      return likeDocument.get();
    } else {
      res.status(500).json({
        err: 'scream not found'
      });
    }
  }).then(function (data) {
    // Vì có điều kiện where nên chỉ có data.docs[0]
    console.log('Unlike Data:', data.docs[0]);

    if (data.empty) {
      return res.status(500).json({
        error: 'Scream not liked'
      });
    } else {
      return db.doc("/likes/".concat(data.docs[0].id))["delete"]().then(function () {
        screamData.likeCount--;
        return screamDocument.update({
          likeCount: screamData.likeCount
        });
      }).then(function () {
        return res.json({
          message: 'Unlike successfully',
          screamData: screamData
        });
      })["catch"](function (err) {
        return res.status(500).json({
          err: err.code,
          message: 'Unlike fails'
        });
      });
    }
  })["catch"](function (err) {
    console.log(err);
    res.status(500).json({
      err: err.code
    });
  });
};