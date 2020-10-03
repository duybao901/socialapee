"use strict";

var _require = require('../util/admin'),
    admin = _require.admin,
    db = _require.db;

var firebase = require('firebase');

var firebaseConfig = require('../util/config');

firebase.initializeApp(firebaseConfig);

var _require2 = require('../util/validator'),
    validateSignupData = _require2.validateSignupData,
    validateLoginData = _require2.validateLoginData,
    reducerUserDetails = _require2.reducerUserDetails;

var _require3 = require('firebase-functions/lib/providers/auth'),
    user = _require3.user; //TODO  user Sign up


module.exports.signUp = function (req, res) {
  var newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    handle: req.body.handle
  };

  var _validateSignupData = validateSignupData(newUser),
      valid = _validateSignupData.valid,
      errors = _validateSignupData.errors;

  if (!valid) {
    return res.status(400).json(errors);
  }

  var noImage = 'no-image.png'; // TODO: vadidate Data
  // Doc(/users/${newUser.handle}) -> kiểm tra doc.exists -> chưa tồn tại -> 
  // Tạo user và lưu vào aithentication -> Trả về Promise  (data)  ->  // Trả về Promise (token) -> Lấy token là lưu vào collection: users của cloud store

  var token, userID;
  admin.firestore().doc("/users/".concat(newUser.handle)).get().then(function (doc) {
    if (doc.exists) {
      return res.status(400).json({
        handle: "this handle is already taken !"
      });
    } else {
      // Tạo user và lưu vào aithentication
      return firebase.auth().createUserWithEmailAndPassword(newUser.email, newUser.password); // Trả về Promise  (data)                
    }
  }).then(function (data) {
    userID = data.user.uid; // res.json(data.user)

    return data.user.getIdToken(); // Trả về Promise (token)
  }).then(function (tokenId) {
    // Lấy token là lưu vào collection: users của cloud store
    token = tokenId;
    var userCredential = {
      email: newUser.email,
      handle: newUser.handle,
      createdAt: new Date().toISOString(),
      imageUrl: "https://firebasestorage.googleapis.com/v0/b/".concat(firebaseConfig.storageBucket, "/o/").concat(noImage, "?alt=media"),
      userId: userID
    };
    admin.firestore().doc("/users/".concat(newUser.handle)).set(userCredential); // Trả về 1 Promise   
  }).then(function () {
    return res.status(201).json({
      token: token
    });
  })["catch"](function (err) {
    // Bắt lỗi khi post lên user đã tồn tại
    console.log(err);

    if (err.code === "auth/email-already-in-use") {
      return res.status(500).json({
        email: "Email is already used"
      });
    } else {
      return res.status(500).json({
        general: 'Somthing went wrong, please try again'
      });
    }
  });
}; //TODO  user Log in


module.exports.login = function (req, res) {
  var user = {
    email: req.body.email,
    password: req.body.password
  };

  var _validateLoginData = validateLoginData(user),
      valid = _validateLoginData.valid,
      errors = _validateLoginData.errors;

  if (!valid) {
    return res.status(400).json(errors);
  }

  firebase.auth().signInWithEmailAndPassword(user.email, user.password).then(function (data) {
    return data.user.getIdToken();
  }).then(function (token) {
    return res.json({
      token: token
    });
  })["catch"](function (err) {
    // auth/wrong-password
    // auth/user-not-user
    return res.status(500).json({
      general: "Wrong credential, please try again"
    });
  });
}; //TODO  Add user details


module.exports.addUserDetails = function (req, res) {
  var userDetails = reducerUserDetails(req.body);
  db.doc("/users/".concat(req.user.handle)).update(userDetails).then(function () {
    return res.json({
      message: 'Update user successfully'
    });
  })["catch"](function (err) {
    console.error(err);
    return res.status(500).json({
      error: err.code
    });
  });
}; //TODO Get User Detials


module.exports.getUserDetails = function (req, res) {
  var userData = {};
  db.doc("/users/".concat(req.params.handle)).get().then(function (doc) {
    if (doc.exists) {
      userData = doc.data();
      return db.collection('screams').where('userHandle', '==', req.params.handle).orderBy('createdAt', 'desc').get().then(function (data) {
        userData.screams = [];
        data.forEach(function (doc) {
          userData.screams.push({
            body: doc.data().body,
            createdAt: doc.data().createdAt,
            userHandle: doc.data().userHandle,
            likeCount: doc.data().likeCount,
            commentCount: doc.data().commentCount,
            userImage: doc.data().userImage,
            screamId: doc.data().body
          });
        });
        res.json(userData);
      })["catch"](function (err) {
        console.error(err);
        res.status(500).json({
          err: err.code
        });
      });
    } else {
      res.json({
        message: "user not found"
      });
    }
  });
}; //TODO  Get a authenticated user


module.exports.getAuthenticatedUser = function (req, res) {
  var userData = {};
  db.doc("/users/".concat(req.user.handle)).get().then(function (doc) {
    if (doc.exists) {
      userData.credential = doc.data();
      return db.collection('likes').where('userHandle', '==', req.user.handle).get();
    }
  }).then(function (data) {
    userData.likes = [];
    data.forEach(function (doc) {
      userData.likes.push(doc.data(0));
    });
    return db.collection('nofifications').where('recipient', '==', req.user.handle).get();
  }).then(function (data) {
    userData.notifications = [];
    data.forEach(function (doc) {
      userData.notifications.push({
        recipient: doc.data().recipient,
        sender: doc.data().sender,
        screamId: doc.data().screamId,
        createdAt: doc.data().createdAt,
        type: doc.data().type,
        read: doc.data().read,
        notificationId: doc.data().notificationId
      });
    });
    return res.json(userData);
  })["catch"](function (err) {
    console.error(err);
    res.status(500).json({
      err: err.code
    });
  });
}; //TODO  Upload a user image
//* Để mở được ảnh thì chỉnh rule của storage thành "allow read;" */


module.exports.uploadImage = function (req, res) {
  var Busboy = require('busboy');

  var path = require('path');

  var os = require('os');

  var fs = require('fs');

  var imageFileName;
  var imageToBeUploaded = {};
  var busboy = new Busboy({
    headers: req.headers
  });
  busboy.on('file', function (fieldName, file, filename, encoding, minetype) {
    console.log("fieldName", fieldName);
    console.log("filename", filename);
    console.log("minetype", minetype); // imgae.png -> .png

    var imageExtention = filename.split('.')[filename.split('.').length - 1]; // 1231389687.png

    imageFileName = "".concat(Math.round(Math.random() * 100000000000000), ".").concat(imageExtention);
    var filepath = path.join(os.tmpdir(), imageFileName);
    imageToBeUploaded = {
      filepath: filepath,
      minetype: minetype
    };
    file.pipe(fs.createWriteStream(filepath));
  });
  busboy.on('finish', function () {
    // Úp ảnh lên storage
    admin.storage().bucket(firebaseConfig.storageBucket).upload(imageToBeUploaded.filepath, {
      // return promise
      resumable: false,
      metadata: {
        metadata: {
          contentType: imageToBeUploaded.minetype
        }
      }
    }).then(function () {
      //*  ?alt=media thêm dòng này thì mở ảnh nó sẽ ko tự download vẻ mà chỉ show ra 
      //*  Thay đổi ảnh hiện tại
      var imageUrl = "https://firebasestorage.googleapis.com/v0/b/".concat(firebaseConfig.storageBucket, "/o/").concat(imageFileName, "?alt=media");
      return admin.firestore().doc("/users/".concat(req.user.handle)).update({
        imageUrl: imageUrl
      });
    }).then(function () {
      res.json({
        message: 'upload image successfully'
      });
    })["catch"](function (err) {
      console.log(err);
      res.json(err);
    });
  });
  busboy.end(req.rawBody); // Nếu không có dòng này thì trình duyệt sẽ request mãi mãi
}; // TODO Đánh dấu dã đọc thông báo
// https://firebase.google.com/docs/firestore/manage-data/transactions#web_2


module.exports.markNotificationRead = function (req, res) {
  // Khai báo batch
  var batch = db.batch();
  req.body.forEach(function (notificationId) {
    //Vào từng thông báo và update lại thằng read: true
    var notification = db.doc("/notifications/".concat(notificationId));
    batch.update(notification, {
      read: true
    });
  });
  batch.commit() // return promise
  .then(function () {
    return res.json({
      message: 'Notifications Mark read'
    });
  })["catch"](function (err) {
    console.error(err);
    res.status(500).json({
      err: err.code
    });
  });
};