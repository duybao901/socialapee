const { user } = require("firebase-functions/lib/providers/auth");

const isEmail = (email) => {
    const regex = '/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/'
    if (email.match(regex)) {
        return true;
    } else {
        return false;
    }
}

const isEmpty = (string) => {
    if (string.trim() === '') {
        return true;
    } else {
        return false;
    }
}

module.exports.validateSignupData = (data) => {
    let errors = {};
    if (isEmpty(data.email)) {
        errors.email = 'Email must not be empty';
    } else {
        if (isEmail(data.email)) {
            errors.email = 'Email must be a email address';
        }
    }
    if (data.password === "") errors.password = 'Must not be empty';
    if (data.password !== data.confirmPassword) errors.confirmPassword = "Password must match"
    if (isEmpty(data.handle)) errors.handle = 'Must not be empty';
    return {
        errors,
        valid: Object.keys(errors).length === 0 ? true : false
    }
}

module.exports.validateLoginData = (data) => {
    const errors = {};
    if (isEmpty(data.email)) errors.email = 'Email not empty';
    if (isEmpty(data.password)) errors.password = 'Password not empty';
    return {
        errors,
        valid: Object.keys(errors).length === 0 ? true : false
    }
}

module.exports.reducerUserDetails = (data) => {
    const userDetails = {};
    if (!isEmpty(data.bio.trim())) userDetails.bio = data.bio;
    if (!isEmpty(data.website.trim())) {
        // http://user.com
        if (data.website.trim().substring(0, 4) !== "http") {
            userDetails.website = `https://${data.website}`
        } else {
            userDetails.website = data.website;
        }
    }
    userDetails.location = data.location;
    return userDetails;
}