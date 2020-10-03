const {
  admin,
  db
} = require('../util/admin');
const firebase = require('firebase');
const firebaseConfig = require('../util/config')
firebase.initializeApp(firebaseConfig);
const {
  validateSignupData,
  validateLoginData,
  reducerUserDetails
} = require('../util/validator');
const {
  user
} = require('firebase-functions/lib/providers/auth');

//TODO  user Sign up
module.exports.signUp = (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    handle: req.body.handle
  }

  const {
    valid,
    errors
  } = validateSignupData(newUser);
  if (!valid) {
    return res.status(400).json(errors)
  }

  const noImage = 'no-image.png';

  // TODO: vadidate Data
  // Doc(/users/${newUser.handle}) -> kiểm tra doc.exists -> chưa tồn tại -> 
  // Tạo user và lưu vào aithentication -> Trả về Promise  (data)  ->  // Trả về Promise (token) -> Lấy token là lưu vào collection: users của cloud store
  let token, userID;
  admin.firestore().doc(`/users/${newUser.handle}`).get()
    .then(doc => {
      if (doc.exists) {
        return res.status(400).json({
          handle: `this handle is already taken !`
        })
      } else {
        // Tạo user và lưu vào aithentication
        return firebase.auth().createUserWithEmailAndPassword(newUser.email, newUser.password) // Trả về Promise  (data)                
      }
    })
    .then(data => {
      userID = data.user.uid;
      // res.json(data.user)
      return data.user.getIdToken() // Trả về Promise (token)
    })
    .then(tokenId => {
      // Lấy token là lưu vào collection: users của cloud store
      token = tokenId;
      const userCredential = {
        email: newUser.email,
        handle: newUser.handle,
        createdAt: new Date().toISOString(),
        imageUrl: `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${noImage}?alt=media`,
        userId: userID
      }
      admin.firestore().doc(`/users/${newUser.handle}`).set(userCredential) // Trả về 1 Promise   
    })
    .then(() => {
      return res.status(201).json({
        token
      })
    })
    .catch(err => { // Bắt lỗi khi post lên user đã tồn tại
      console.log(err)
      if (err.code === "auth/email-already-in-use") {
        return res.status(500).json({
          email: `Email is already used`
        })
      } else {
        return res.status(500).json({
          general: 'Somthing went wrong, please try again'
        })
      }
    })
}

//TODO  user Log in
module.exports.login = (req, res) => {
  const user = {
    email: req.body.email,
    password: req.body.password
  }

  const {
    valid,
    errors
  } = validateLoginData(user);
  if (!valid) {
    return res.status(400).json(errors)
  }

  firebase.auth().signInWithEmailAndPassword(user.email, user.password)
    .then(data => {
      return data.user.getIdToken();
    })
    .then(token => {
      return res.json({
        token
      })
    })
    .catch(err => {
      // auth/wrong-password
      // auth/user-not-user
      return res.status(500).json({
        general: "Wrong credential, please try again"
      })
    })
}
//TODO  Add user details
module.exports.addUserDetails = (req, res) => {
  const userDetails = reducerUserDetails(req.body);
  db.doc(`/users/${req.user.handle}`).update(userDetails)
    .then(() => {
      return res.json({
        message: 'Update user successfully'
      });
    })
    .catch((err) => {
      console.error(err)
      return res.status(500).json({
        error: err.code
      })
    })
}

//TODO Get User Detials
module.exports.getUserDetails = (req, res) => {
  let userData = {};
  db.doc(`/users/${req.params.handle}`).get()
    .then(doc => {
      if (doc.exists) {
        userData = doc.data();
        return db.collection('screams').where('userHandle', '==', req.params.handle)
          .orderBy('createdAt', 'desc')
          .get()
          .then((data) => {
            userData.screams = [];
            data.forEach(doc => {
              userData.screams.push({
                body: doc.data().body,
                createdAt: doc.data().createdAt,
                userHandle: doc.data().userHandle,
                likeCount: doc.data().likeCount,
                commentCount: doc.data().commentCount,
                userImage: doc.data().userImage,
                screamId: doc.data().body,
              })
            })
            res.json(userData);
          })
          .catch((err) => {
            console.error(err);
            res.status(500).json({
              err: err.code
            })
          })
      } else {
        res.json({
          message: "user not found"
        })
      }
    })
}


//TODO  Get a authenticated user
module.exports.getAuthenticatedUser = (req, res) => {
  const userData = {};
  db.doc(`/users/${req.user.handle}`).get()
    .then(doc => {
      if (doc.exists) {
        userData.credential = doc.data();
        return db.collection('likes').where('userHandle', '==', req.user.handle).get();
      }
    })
    .then(data => {
      userData.likes = [];
      data.forEach(doc => {
        userData.likes.push(doc.data(0))
      });
      return db.collection('nofifications').where('recipient', '==', req.user.handle).get()
    })
    .then((data) => {
      userData.notifications = [];
      data.forEach(doc => {
        userData.notifications.push({
          recipient: doc.data().recipient,
          sender: doc.data().sender,
          screamId: doc.data().screamId,
          createdAt: doc.data().createdAt,
          type: doc.data().type,
          read: doc.data().read,
          notificationId: doc.data().notificationId,
        })
      })
      return res.json(userData)
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({
        err: err.code
      })
    })
}

//TODO  Upload a user image
//* Để mở được ảnh thì chỉnh rule của storage thành "allow read;" */
module.exports.uploadImage = (req, res) => {
  const Busboy = require('busboy')
  const path = require('path');
  const os = require('os');
  const fs = require('fs');

  let imageFileName;
  let imageToBeUploaded = {};
  const busboy = new Busboy({
    headers: req.headers
  })
  busboy.on('file', (fieldName, file, filename, encoding, minetype) => {
    console.log("fieldName", fieldName);
    console.log("filename", filename);
    console.log("minetype", minetype);
    // imgae.png -> .png
    const imageExtention = filename.split('.')[filename.split('.').length - 1];
    // 1231389687.png
    imageFileName = `${Math.round(Math.random() * 100000000000000)}.${imageExtention}`;
    const filepath = path.join(os.tmpdir(), imageFileName);
    imageToBeUploaded = {
      filepath,
      minetype
    };
    file.pipe(fs.createWriteStream(filepath));
  });
  busboy.on('finish', () => {
    // Úp ảnh lên storage
    admin.storage().bucket(firebaseConfig.storageBucket).upload(imageToBeUploaded.filepath, { // return promise
        resumable: false,
        metadata: {
          metadata: {
            contentType: imageToBeUploaded.minetype
          }
        }
      })
      .then(() => {
        //*  ?alt=media thêm dòng này thì mở ảnh nó sẽ ko tự download vẻ mà chỉ show ra 
        //*  Thay đổi ảnh hiện tại
        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${imageFileName}?alt=media`
        return admin.firestore().doc(`/users/${req.user.handle}`).update({
          imageUrl
        })
      })
      .then(() => {
        res.json({
          message: 'upload image successfully'
        });
      })
      .catch(err => {
        console.log(err);
        res.json(err);
      })
  })
  busboy.end(req.rawBody) // Nếu không có dòng này thì trình duyệt sẽ request mãi mãi
}

// TODO Đánh dấu dã đọc thông báo
// https://firebase.google.com/docs/firestore/manage-data/transactions#web_2
module.exports.markNotificationRead = (req, res) => {
  // Khai báo batch
  let batch = db.batch();
  req.body.forEach(notificationId => {
    //Vào từng thông báo và update lại thằng read: true
    const notification = db.doc(`/notifications/${notificationId}`);
    batch.update(notification, {
      read: true
    })
  })
  batch.commit() // return promise
    .then(() => {
      return res.json({
        message: 'Notifications Mark read'
      });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({
        err: err.code
      })
    })
}