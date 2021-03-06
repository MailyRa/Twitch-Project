"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var session = require('express-session');
var crud = require('./db/crud');
var newsAPI = require('./newsapi');
var bcrypt = require('bcrypt');
var saltRounds = 10;
var app = express_1.default();
var port = 8080;
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: false }));
app.use(session({
    secret: 'MySecret',
    resave: false,
    saveUninitialized: false,
}));
app.set('view engine', 'html');
require('dotenv').config();
//Create User
app.post('/sign_up', function (req, res) {
    var firstName = req.body["firstName"];
    var lastName = req.body["lastName"];
    var email = req.body["email"];
    var password = req.body["password"];
    crud.getUserByEmail(email).then(function (existingUserResult) {
        if (existingUserResult.length > 0) {
            res.send(JSON.stringify({ "error": "User already exists" }));
        }
        else {
            hashPassword(password, function (err, hashedPassword) {
                crud.createUser(firstName, lastName, email, hashedPassword).then(function (newUser) {
                    session.currentUser = newUser.id;
                    res.send(JSON.stringify({
                        "success": true
                    }));
                });
            });
        }
    });
});
//Hash Password
function hashPassword(password, callback) {
    bcrypt.hash(password, saltRounds, function (err, hash) {
        return callback(err, hash);
    });
}
//Validate Hash
function isValidPassword(plainPassword, hashedPassword, callback) {
    bcrypt.compare(plainPassword, hashedPassword, function (err, result) {
        return callback(err, result);
    });
}
//Handle Login
app.post('/handle_login', function (req, res) {
    var userEmail = req.body["email"];
    var userPassword = req.body["password"];
    var users = crud.getUserByEmail(userEmail).then(function (users) {
        if (users.length === 0) {
            res.send(JSON.stringify({ "error": "Incorrect Password or Username" }));
        }
        isValidPassword(userPassword, users[0].password, function (err, result) {
            if (result === true) {
                session.currentUser = users[0].id;
                res.send(JSON.stringify({ "success": true }));
            }
            else {
                res.send(JSON.stringify({ "error": "Incorrect Password or Username" }));
            }
        });
    });
});
//NewsAPI Route
app.get('/news_feed', function (req, res) {
    newsAPI.getHeadlines().then(function (apiResponse) {
        console.log(apiResponse);
        res.send(JSON.stringify(apiResponse));
    });
});
// Create Save Articles 
app.post('/save_article', function (req, res) {
    var articleAuthor = req.body["articleAuthor"];
    var articleTitle = req.body["articleTitle"];
    var articleImg = req.body["articleImg"];
    var articleDescription = req.body["articleDescription"];
    var articleUrl = req.body["articleUrl"];
    var articleContent = req.body["articleContent"];
    var userId = session.currentUser;
    crud.createSavedArticle(articleAuthor, articleTitle, articleImg, articleDescription, articleUrl, articleContent, userId).then(function (savedArticle) {
        res.send(JSON.stringify({
            "success": true
        }));
    });
});
//Display saved articles
app.get('/user_saved_articles', function (req, res) {
    var currentUser = session.currentUser;
    crud.getArticlesByUserId(currentUser).then(function (savedArticles) {
        var articlesJson = [];
        for (var _i = 0, savedArticles_1 = savedArticles; _i < savedArticles_1.length; _i++) {
            var savedArticle = savedArticles_1[_i];
            articlesJson.push({
                "author": savedArticle.articleAuthor,
                "title": savedArticle.articleTitle,
                "urlToImage": savedArticle.articleImg,
                "description": savedArticle.articleDescription,
                "url": savedArticle.articleUrl
            });
        }
        res.send(JSON.stringify({
            "articles": articlesJson
        }));
    });
});
//Handle logout 
app.post('/handle_logout', function (req, res) {
    session.currentUser = null;
    res.send(JSON.stringify({
        "success": true
    }));
});
app.listen(port, function () {
    console.log("Listening at http://localhost:" + port);
});
module.exports = app;
