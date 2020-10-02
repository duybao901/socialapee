const admin = require('firebase-admin')
// admin setup
admin.initializeApp();
const db = admin.firestore()

module.exports = {admin , db};