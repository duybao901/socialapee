const { db } = require('../util/admin')

// TODO: fetch all scream
module.exports.getAllScreams = (req, res) => {
    db.collection('screams').get()
        .then(data => {
            let screams = [];
            data.forEach(doc => {
                screams.push({
                    screams: doc.id,
                    body: doc.data().body,
                    userHandle: doc.data().userHandle,
                    createdAt: doc.data().createdAt,
                    likeCount: doc.data().likeCount,
                    commentCount: doc.data().commentCount,
                });
            })
            return res.json(screams);
        })
        .catch(err => {
            console.log(err);
        })
}

// TODO: Post a scream
module.exports.postOneScream = (req, res) => {
    if (req.method !== "POST") {
        return res.status(400).json({ err: `Method not alow` })
    }
    const newScreams = {
        body: req.body.body,
        userHandle: req.user.handle,
        userImage: req.user.imageUrl,
        likeCount: 0,
        commentCount: 0,
        createdAt: new Date().toISOString(),
    };

    db.collection('screams')
        .add(newScreams)
        .then(doc => {
            const resScream = newScreams;
            resScream.screamId = doc.id;
            res.json(resScream)
        })
        .catch(err => {
            return res.status(400).json({ err: `something error ` })
        })
}

// TODO: fetch a scream 
module.exports.getScream = (req, res) => {
    let screamData = {};

    db.doc(`/screams/${req.params.screamId}`).get()
        .then((doc) => {
            if (!doc.exists) {
                res.status(404).json({ err: "scream not found" })
            }
            screamData = doc.data();
            console.log(doc.data())
            // doc.id -> scream id
            screamData.screamId = doc.id;
            return db.collection('comments')
                .orderBy('createdAt', 'desc') //Muốn sủ dụng hàm này thì cần phải tạo index
                .where("screamId", "==", req.params.screamId).get()
        })
        .then((data) => {
            screamData.comments = [];
            data.forEach(doc => {
                screamData.comments.push(doc.data());
            })
            return db.collection('likes')
                .where("screamId", "==", req.params.screamId).get()
        })
        .then((data) => {
            screamData.likes = [];
            data.forEach(doc => {
                screamData.likes.push(doc.data());
            })
            res.json(screamData)
        })
        .catch((err) => {
            console.error(err);
            res.status(500).json({ err: err.code })
        })
}

// TODO: Post a comments
module.exports.commentOnScream = (req, res) => {
    // Validate body
    if (req.body.body.trim() === '') return res.status(404).json({ message: 'Body not empty' });

    let newComment = {
        body: req.body.body,
        createdAt: new Date().toISOString(),
        userHandler: req.user.handle,
        userImage: req.user.imageUrl,
        screamId: req.params.screamId
    }

    db.doc(`/screams/${req.params.screamId}`).get()
        .then((doc) => {
            if (!doc.exists) {
                return res.status(500).json({ err: 'Screams Not found' })
            }
            return doc.ref.update({ commentCount: doc.data().commentCount + 1 });
        })
        .then(() => {
            return db.collection('comments').add(newComment);
        })
        .then(() => {
            res.json('Add comment successfully');
        })
        .catch((err) => {
            console.error(err);
            res.status(500).json({ err: err.code })
        })
}

// TODO: Delete a scream
module.exports.deleteScream = (req, res) => {
    const screamDocument = db.doc(`/screams/${req.params.screamId}`).get();

    screamDocument.then(doc => {
        if (!doc.exists) {
            return res.status(403).json({ Error: 'Scream not found' });
        }
        if (doc.data().userHandle !== req.user.handle) {
            return res.status(403).json({ Error: 'Can not delete scream' });
        }
        return db.doc(`/screams/${req.params.screamId}`).delete();
    })
        .then(() => {
            res.json({message:'delete scream successfully'})
        })
        .catch(error => {
            console.error(error);
            res.status(500).json({err: error.code})
        })
}

// TODO: Like a scream
module.exports.likeScream = (req, res) => {

    const likeDocument = db.collection('likes')
        .where('userHandle', '==', req.user.handle)
        .where('screamId', '==', req.params.screamId)
        .limit(1)

    const screamDocument = db.doc(`/screams/${req.params.screamId}`);

    let screamData;

    screamDocument.get()
        .then((doc) => {
            console.log('Like Doc:', doc)
            if (doc.exists) {
                screamData = doc.data();
                screamData.screamId = doc.id;
                return likeDocument.get()
            } else {
                res.status(500).json({ err: 'scream not found' })
            }
        })
        .then((data) => {
            console.log('Like Data: ', data);
            // Nếu có data thì đã like rồi
            if (data.empty) {
                return db.collection('likes').add({
                    screamId: req.params.screamId,
                    userHandle: req.user.handle
                })
                    .then(() => {
                        screamData.likeCount++
                        return screamDocument.update({ likeCount: screamData.likeCount })
                    })
                    .then(() => {
                        res.json({ message: `${req.user.handle} Like a scream ${req.params.screamId} succesfully` })
                    })
                    .catch(err => {
                        console.log(err);
                        res.status(500).json({ err: err.code })
                    })
            } else {
                return res.status(500).json({ error: 'Scream already liked' })
            }
        })
        .catch(err => {
            console.log('err:', err);
            res.status(500).json({ error: err.code });
        })

}

// TODO: Unlike a scream
module.exports.unlikeScream = (req, res) => {
    const likeDocument = db.collection('likes')
        .where('userHandle', '==', req.user.handle)
        .where('screamId', '==', req.params.screamId);

    const screamDocument = db.doc(`/screams/${req.params.screamId}`);

    let screamData = {};

    screamDocument.get()
        .then((doc) => {
            console.log('Unlike Doc:', doc)
            if (doc.exists) {
                screamData = doc.data();
                screamData.screamId = doc.id;
                return likeDocument.get()
            } else {
                res.status(500).json({ err: 'scream not found' })
            }
        })
        .then((data) => {
            // Vì có điều kiện where nên chỉ có data.docs[0]
            console.log('Unlike Data:', data.docs[0])
            if (data.empty) {
                return res.status(500).json({ error: 'Scream not liked' })
            } else {
                return db.doc(`/likes/${data.docs[0].id}`).delete()
                    .then(() => {
                        screamData.likeCount--;
                        return screamDocument.update({ likeCount: screamData.likeCount })
                    })
                    .then(() => {
                        return res.json({ message: 'Unlike successfully', screamData },)
                    })
                    .catch((err) => {
                        return res.status(500).json({ err: err.code, message: 'Unlike fails' })
                    })
            }
        })
        .catch(err => {
            console.log(err);
            res.status(500).json({ err: err.code })
        })
}