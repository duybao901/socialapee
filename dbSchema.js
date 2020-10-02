let db = {
    screams: [
        {
            userHandle: "user",
            body: "this is body",
            createdAt: "2020-09-25T14:54:32.899Z",
            likeCount: 5,
            conmentCount: 2
        }
    ],
    comments: [
        {
            userHandle: 'user',
            screamId: "gaiuirqqwer123",
            body: 'nice one ape',
            createdAt:'2020-09-25T14:54:32.899Z"'
        }
    ],
    users: [
        {
            userHandle: "user",
            createdAt: "2020-09-27T07:11:14.444Z",
            email: "jojo@gmail.com",
            handle: "jojo",
            userId: "OFbbMEGtEDO23mxGbtIukC6yRbx2",
            bio: "hello,my name is user , nice to meet you",
            website: "https://user.com",
            location: "London, UK"
        }
    ]
}
let userDetails = {
    // Redux data
    credentials: {
        userId: "OFbbMEGtEDO23mxGbtIukC6yRbx2",
        userHandle: "user",
        createdAt: "2020-09-27T07:11:14.444Z",
        email: "jojo@gmail.com",
        handle: "jojo",
        bio: "hello,my name is user , nice to meet you",
        website: "https://user.com",
        location: "London, UK"
    },
    like: [
        {
            userHandle: "user",
            screamId: ""
        }
    ]
}