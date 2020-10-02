const admin = require('firebase-admin');
const FBauth = (req, res, next) => {
  let idToken;
  // startsWith() method xác định liệu một chuỗi bắt đầu với các chữ cái của chuỗi khác hay không, trả về giá trị true hoặc false tương ứng.
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    idToken = req.headers.authorization.split('Bearer ')[1];
  } else {
    // 403 = Forbidden
    console.error('No token found')
    return res.status(403).json({ error: `Unauthorized` })
  }

  // TODO: Verify The Token 
  admin.auth().verifyIdToken(idToken)
    .then(decodedToken => {
      req.user = decodedToken;
      return admin.firestore().collection('users')
        .where('userId', '==', req.user.uid)
        .limit(1)
        .get()
    })
    .then(data => {
      req.user.handle = data.docs[0].data().handle;
      req.user.imageUrl = data.docs[0].data().imageUrl;
      return next();
    })
    .catch(err => {
      console.log(`Error while erifying token`, err);
      return res.status(400).json(err);
    })
}

module.exports = FBauth;