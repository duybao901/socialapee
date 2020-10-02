const app = require('express')();
const functions = require('firebase-functions');
const { db } = require('./util/admin')
const {
  getAllScreams,
  postOneScream,
  getScream,
  commentOnScream,
  likeScream,
  unlikeScream,
  deleteScream
} = require('./handlers/screams')
const { signUp, login, uploadImage, addUserDetails, getAuthenticatedUser } = require('./handlers/users')
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
//*  https://baseurl.com/api/
// functions.https.onRequest sẽ bắt được sự kiện khi có request đến
// Tạo ra functions kết hợp vs express để tạo ra url như thế này https://baseurl.com/api/screams
exports.api = functions.https.onRequest(app);

exports.createNotifycationOnLike = functions.firestore.document('likes/{id}')
  .onCreate((snapshot) => {
    console.log("SNAPSHOT Create Comment: ", snapshot);
    console.log("DOC exists")

    db.doc(`/screams/${snapshot.data().screamId}`).get()
      .then(doc => {
        if (doc.exists) {
          return db.doc(`/nofifications/${snapshot.id}`).set({
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

exports.deleteNotifycationOnUnlike = functions.firestore.document('likes/{id}')
  .onDelete(snapshot => {
    console.log("SNAPSHOT Delete Unlike: ", snapshot);
    return db.doc(`/nofifications/${snapshot.id}`).delete()
      .catch(err => {
        console.error(err);
      })
  })

exports.createNotifycationOnComment = functions.firestore.document('comments/{id}')
  .onCreate((snapshot) => {
    console.log("SNAPSHOT Create Comment: ", snapshot);
    console.log("DOC exists")

    db.doc(`/screams/${snapshot.data().screamId}`).get()
      .then(doc => {
        if (doc.exists) {
          console.log("DOC exists")
          return db.doc(`/nofifications/${snapshot.id}`).set({
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