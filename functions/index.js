const app = require('express')();
const functions = require('firebase-functions');
const {
  db
} = require('./util/admin')
const {
  getAllScreams,
  postOneScream,
  getScream,
  commentOnScream,
  likeScream,
  unlikeScream,
  deleteScream
} = require('./handlers/screams')
const {
  signUp,
  login,
  uploadImage,
  addUserDetails,
  getAuthenticatedUser,
  getUserDetails,
  markNotificationRead
} = require('./handlers/users')
const FBauth = require('./util/FBauth')

// * Scream Route
// Tạo dữ liệu gửi lên database
app.post('/screams', FBauth, postOneScream)
// Lấy tất cả dữ liệu từ database database
app.get('/screams', getAllScreams)
app.get('/screams/:screamId', getScream)
app.delete('/screams/:screamId', FBauth, deleteScream)
app.get('/screams/:screamId/like', FBauth, likeScream)
app.get('/screams/:screamId/unlike', FBauth, unlikeScream)
app.post('/screams/:screamId/comment', FBauth, commentOnScream)


// * User Route
// Signup Route
app.post('/signup', signUp)
// Login route
app.post('/login', login)
app.post('/user/image', FBauth, uploadImage)
app.post('/user', FBauth, addUserDetails)
app.get('/user', FBauth, getAuthenticatedUser)
app.get('/user/:handle', getUserDetails)
app.post('/notifications', FBauth, markNotificationRead)
//*  https://baseurl.com/api/
// functions.https.onRequest sẽ bắt được sự kiện khi có request đến
// Tạo ra functions kết hợp vs express để tạo ra url như thế này https://baseurl.com/api/screams
exports.api = functions.https.onRequest(app);

// Tạo 1 thông báo khi like scream
exports.createNotifycationOnLike = functions.firestore.document('likes/{id}')
  .onCreate((snapshot) => {
    console.log("SNAPSHOT Create Comment: ", snapshot);
    console.log("DOC exists")
    return db.doc(`/screams/${snapshot.data().screamId}`).get()
      .then(doc => {
        if (doc.exists) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date(),
            recipient: doc.data().userHandle,
            sender: doc.data().userHandle,
            screamId: snapshot.data().screamId, // doc.id
            type: 'like',
            read: false
          })
        }
      })
      .catch(err => {
        console.error(err);
      })
  })

// Khi unlike thì xóa thông báo like
exports.deleteNotifycationOnUnlike = functions.firestore.document('likes/{id}')
  .onDelete(snapshot => {
    console.log("SNAPSHOT Delete Unlike: ", snapshot);
    return db.doc(`/notifications/${snapshot.id}`).delete()
      .catch(err => {
        console.error(err);
      })
  })

// Tạo 1 thông báo khi comment trên scream
exports.createNotifycationOnComment = functions.firestore.document('comments/{id}')
  .onCreate((snapshot) => {
    console.log("SNAPSHOT Create Comment: ", snapshot);
    console.log("DOC exists")
    return db.doc(`/screams/${snapshot.data().screamId}`).get()
      .then(doc => {
        if (doc.exists) {
          console.log("DOC exists")
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date(),
            recipient: doc.data().userHandle,
            sender: doc.data().userHandle,
            screamId: snapshot.data().screamId, // doc.id
            type: 'comment',
            read: false
          })
        }
      })
      .catch(err => {
        console.error(err);
      })
  })

// Thay đổi ảnh đai diện thì ảnh đại diện ở scream cũng thay đổi theo
exports.onUserChangeImage = functions.firestore.document(`users/{userId}`)
  .onUpdate(change => {
    console.log('Before Change:', change.before.data());
    console.log('After Change:', change.after.data());
    let batch = db.batch()
    if (change.before.data() !== change.after.data()) {
      return db.collection('screams').where('userHandle', '==', change.before.data().handle).get() //change.before.data().handle của users
        .then((data) => {
          data.forEach(doc => {
            const scream = db.doc(`/screams/${doc.id}`);
            batch.update(scream, {
              userImage: change.after.data().imageUrl
            }) // change.after.data().imageUrl của users      
          })
          return batch.commit();
        })
    }
  })

// Xóa 1 scream thì like và comment cũng xóa theo
exports.onDeleteScream = functions.firestore.document('screams/{screamId}')
  .onDelete((snapshot, context) => {
    // Cần context thì context chứa params
    const screamId = context.params.screamId;
    let batch = db.batch();
    return db.collection('comments').where('screamId', "==", screamId).get()
      .then((data) => {
        data.forEach(doc => {
          batch.delete(db.doc(`/comments/${doc.id}`));
        })
        return db.collection('likes').where('screamId', "==", screamId).get()
          .then((data) => {
            data.forEach(doc => {
              batch.delete(db.doc(`/likes/${doc.id}`));
            })
            return db.collection('notifications').where('screamId', "==", screamId).get()
              .then((data) => {
                data.forEach(doc => {
                  batch.delete(db.doc(`/notifications/${doc.id}`));
                })
                return batch.commit();
              })
          })
      })
      .catch(err => {
        console.err(err);
      })
  })