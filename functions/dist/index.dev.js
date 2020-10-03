"use strict";

var app = require('express')();

var functions = require('firebase-functions');

var _require = require('./util/admin'),
    db = _require.db;

var _require2 = require('./handlers/screams'),
    getAllScreams = _require2.getAllScreams,
    postOneScream = _require2.postOneScream,
    getScream = _require2.getScream,
    commentOnScream = _require2.commentOnScream,
    likeScream = _require2.likeScream,
    unlikeScream = _require2.unlikeScream,
    deleteScream = _require2.deleteScream;

var _require3 = require('./handlers/users'),
    signUp = _require3.signUp,
    login = _require3.login,
    uploadImage = _require3.uploadImage,
    addUserDetails = _require3.addUserDetails,
    getAuthenticatedUser = _require3.getAuthenticatedUser,
    getUserDetails = _require3.getUserDetails,
    markNotificationRead = _require3.markNotificationRead;

var FBauth = require('./util/FBauth'); // * Scream Route
// Tạo dữ liệu gửi lên database


app.post('/screams', FBauth, postOneScream); // Lấy tất cả dữ liệu từ database database

app.get('/screams', getAllScreams);
app.get('/screams/:screamId', getScream);
app["delete"]('/screams/:screamId', FBauth, deleteScream);
app.get('/screams/:screamId/like', FBauth, likeScream);
app.get('/screams/:screamId/unlike', FBauth, unlikeScream);
app.post('/screams/:screamId/comment', FBauth, commentOnScream); // * User Route
// Signup Route

app.post('/signup', signUp); // Login route

app.post('/login', login);
app.post('/user/image', FBauth, uploadImage);
app.post('/user', FBauth, addUserDetails);
app.get('/user', FBauth, getAuthenticatedUser);
app.get('/user/:handle', getUserDetails);
app.post('/notifications', FBauth, markNotificationRead); //*  https://baseurl.com/api/
// functions.https.onRequest sẽ bắt được sự kiện khi có request đến
// Tạo ra functions kết hợp vs express để tạo ra url như thế này https://baseurl.com/api/screams

exports.api = functions.https.onRequest(app); // Tạo 1 thông báo khi like scream

exports.createNotifycationOnLike = functions.firestore.document('likes/{id}').onCreate(function (snapshot) {
  console.log("SNAPSHOT Create Comment: ", snapshot);
  console.log("DOC exists");
  return db.doc("/screams/".concat(snapshot.data().screamId)).get().then(function (doc) {
    if (doc.exists) {
      return db.doc("/notifications/".concat(snapshot.id)).set({
        createdAt: new Date(),
        recipient: doc.data().userHandle,
        sender: doc.data().userHandle,
        screamId: snapshot.data().screamId,
        // doc.id
        type: 'like',
        read: false
      });
    }
  })["catch"](function (err) {
    console.error(err);
  });
}); // Khi unlike thì xóa thông báo like

exports.deleteNotifycationOnUnlike = functions.firestore.document('likes/{id}').onDelete(function (snapshot) {
  console.log("SNAPSHOT Delete Unlike: ", snapshot);
  return db.doc("/notifications/".concat(snapshot.id))["delete"]()["catch"](function (err) {
    console.error(err);
  });
}); // Tạo 1 thông báo khi comment trên scream

exports.createNotifycationOnComment = functions.firestore.document('comments/{id}').onCreate(function (snapshot) {
  console.log("SNAPSHOT Create Comment: ", snapshot);
  console.log("DOC exists");
  return db.doc("/screams/".concat(snapshot.data().screamId)).get().then(function (doc) {
    if (doc.exists) {
      console.log("DOC exists");
      return db.doc("/notifications/".concat(snapshot.id)).set({
        createdAt: new Date(),
        recipient: doc.data().userHandle,
        sender: doc.data().userHandle,
        screamId: snapshot.data().screamId,
        // doc.id
        type: 'comment',
        read: false
      });
    }
  })["catch"](function (err) {
    console.error(err);
  });
}); // Thay đổi ảnh đai diện thì ảnh đại diện ở scream cũng thay đổi theo

exports.onUserChangeImage = functions.firestore.document("users/{userId}").onUpdate(function (change) {
  console.log('Before Change:', change.before.data());
  console.log('After Change:', change.after.data());
  var batch = db.batch();

  if (change.before.data() !== change.after.data()) {
    return db.collection('screams').where('userHandle', '==', change.before.data().handle).get() //change.before.data().handle của users
    .then(function (data) {
      data.forEach(function (doc) {
        var scream = db.doc("/screams/".concat(doc.id));
        batch.update(scream, {
          userImage: change.after.data().imageUrl
        }); // change.after.data().imageUrl của users      
      });
      return batch.commit();
    });
  }
}); // Xóa 1 scream thì like và comment cũng xóa theo

exports.onDeleteScream = functions.firestore.document('screams/{screamId}').onDelete(function (snapshot, context) {
  // Cần context thì context chứa params
  var screamId = context.params.screamId;
  var batch = db.batch();
  return db.collection('comments').where('screamId', "==", screamId).get().then(function (data) {
    data.forEach(function (doc) {
      batch["delete"](db.doc("/comments/".concat(doc.id)));
    });
    return db.collection('likes').where('screamId', "==", screamId).get().then(function (data) {
      data.forEach(function (doc) {
        batch["delete"](db.doc("/likes/".concat(doc.id)));
      });
      return db.collection('notifications').where('screamId', "==", screamId).get().then(function (data) {
        data.forEach(function (doc) {
          batch["delete"](db.doc("/notifications/".concat(doc.id)));
        });
        return batch.commit();
      });
    });
  })["catch"](function (err) {
    console.err(err);
  });
});