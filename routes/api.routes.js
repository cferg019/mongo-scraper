const axios = require('axios')
const cheerio = require('cheerio')
const { Article, Comment } = require('../models')
const { Router } = require('express')
const router = Router()

// A GET route for scraping the echoJS website
router.get("/article", function (req, res, next) {
    const articles = []
    axios.get("https://arstechnica.com/")
        .then(response => {
            const $ = cheerio.load(response.data);
            $("li.article header").each(function () {
                const anchorTag = $(this).children('h2').children('a')
                const excerpt = $(this).children('p.excerpt')
                var article = {
                    title: anchorTag.text(),
                    link: anchorTag.attr('href'),
                    summary: excerpt.text()
                };
                articles.push(article)
            })
            console.log('articles', articles)
            return articles
        })

        .then(articles => {
            const titles = articles.map(article => article.title)
            return Article.find({ title: { $in: titles } })
        })

        .then(duplicateArticles => {
            console.log('we got these duplicates', duplicateArticles)
            const articlesToInsert = articles.filter(article => {
                return !duplicateArticles
                    .map(dupeArticle => dupeArticle.title) // Get just the titles of the dupes
                    .includes(article.title) // Return whether or not the current article's title exists in the duplicate list
            })
            console.log("need to insert these", articlesToInsert)
            return Article.insertMany(articlesToInsert)
        })
        .then(() => {
            return Article.find({})
        })
        .then(allArticles => {
            return res.json(allArticles)
        })
        .catch(err => res.json(err))
});

// Route for grabbing a specific Article by id, populate it with it's note
router.get("/article/:id", function (req, res) {
    Article.findOne({ _id: req.params.id })
        .populate("comments")
        .then(function (dbArticle) {
            res.json(dbArticle);
        })
        .catch(function (err) {
            res.json(err);
        })
});

// Route for saving/updating an Article's associated Note
router.post("/article/:id/comment", function (req, res) {
    Comment.create(req.body)
        .then(function (comment) {
            return Article.findOneAndUpdate({ _id: req.params.id }, { $push: { comments: comment._id }}, { new: true }).populate('comments')
        })
        .then(function (article) {
            // If the User was updated successfully, send it back to the client
            res.json(article);
        })
        .catch(function (err) {
            console.log(err.stack)
            // If an error occurs, send it back to the client
            res.json(err);
        });
});

router.delete('/article/:articleId/comment/:commentId', function (req, res) {
    Article.findOneAndUpdate({ _id: req.params.articleId }, { $pull: { comments: req.params.commentId }}, { new: true })
        .populate('comments')
        .then(article => res.json(article))
        .catch(err => res.json(err))
});

module.exports = router

